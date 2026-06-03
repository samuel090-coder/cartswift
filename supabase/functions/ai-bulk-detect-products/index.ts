import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";

const categories = ["fashion", "books", "tools", "vehicles", "animals"] as const;

const AnalyzeImageSchema = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1).optional().default("Uploaded image"),
  url: z.string().min(1),
  dataUrl: z.string().startsWith("data:image/").optional(),
});

const CandidateListingSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  category: z.enum(categories).optional().default("tools"),
  price: z.number().nullable().optional(),
  currency: z.string().optional().default("USD"),
  images: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
});

const BodySchema = z.union([
  z.object({
    mode: z.literal("analyze").default("analyze"),
    images: z.array(AnalyzeImageSchema).min(1).max(12),
  }),
  z.object({
    mode: z.literal("merge"),
    candidates: z.array(CandidateListingSchema).min(1).max(50),
  }),
]);

const aiHeaders = (key: string) => ({
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});

const safeJson = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const parseToolArguments = (data: any) => {
  const message = data?.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.error("tool args parse error", error);
    }
  }

  if (typeof message?.content === "string") {
    try {
      const match = message.content.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    } catch (error) {
      console.error("content parse error", error);
    }
  }

  return {};
};

const normalizeListing = (listing: any) => ({
  title: String(listing?.title || "Uploaded Product").trim() || "Uploaded Product",
  description: String(listing?.description || "Review this AI-generated draft before posting.").trim(),
  category: categories.includes(listing?.category) ? listing.category : "tools",
  price: Number.isFinite(Number(listing?.price)) ? Math.max(0, Number(listing.price)) : 0,
  currency: String(listing?.currency || "USD").trim() || "USD",
  images: Array.from(new Set(Array.isArray(listing?.images) ? listing.images.filter(Boolean) : [])),
  sourceIds: Array.from(new Set(Array.isArray(listing?.sourceIds) ? listing.sourceIds.filter(Boolean) : [])),
});

async function analyzeImages(images: z.infer<typeof AnalyzeImageSchema>[], apiKey: string) {
  const content: any[] = [
    {
      type: "text",
      text: `You are the same high-quality product analyzer used for a manual admin add-product flow.
Analyze every uploaded image carefully and create professional product listing drafts.

Rules:
- If multiple images show the same exact product/model from different angles or colors, combine them into one listing.
- If products are different, split them into separate listings.
- For each listing return a specific retail-ready title, a customer-facing description, the closest category, a realistic market price in USD, sourceIds, and public image URLs.
- Never use file names, numeric ids, or generic placeholders as the title.
- If the product appears to be shoes, boots, sneakers, sandals, or clothing, category must be fashion.
- Never return an empty result when there are valid product photos; make your best professional draft.`,
    },
  ];

  images.forEach((image, index) => {
    content.push({ type: "text", text: `Image ${index + 1} | sourceId=${image.sourceId} | file=${image.name} | publicUrl=${image.url}` });
    content.push({ type: "image_url", image_url: { url: image.url } });
  });

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are a senior e-commerce copywriter and visual product classifier. Return structured, usable listing drafts only.",
        },
        { role: "user", content },
      ],
      tools: [{
        type: "function",
        function: {
          name: "bulk_product_listings",
          description: "Return grouped product listings detected from uploaded images",
          parameters: {
            type: "object",
            properties: {
              listings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string", enum: [...categories] },
                    price: { type: "number" },
                    currency: { type: "string" },
                    sourceIds: { type: "array", items: { type: "string" } },
                    images: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "description", "category", "price", "currency", "sourceIds", "images"],
                  additionalProperties: false,
                },
              },
            },
            required: ["listings"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "bulk_product_listings" } },
      reasoning: { effort: "low" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("AI analyze error:", response.status, errorBody);
    return { errorStatus: response.status, errorBody };
  }

  const data = await safeJson(response);
  const args = parseToolArguments(data);
  const listings = Array.isArray(args?.listings) ? args.listings.map(normalizeListing).filter((item: any) => item.images.length > 0 || item.sourceIds.length > 0) : [];

  if (listings.length > 0) return { listings };

  return {
    listings: images.map((image) => normalizeListing({
      title: String(image.name || "Uploaded image").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Product",
      description: "AI generated a fallback draft for this uploaded product. Review and adjust before posting.",
      category: "tools",
      price: 0,
      currency: "USD",
      sourceIds: [image.sourceId],
      images: [image.url],
    })),
  };
}

async function mergeCandidates(candidates: z.infer<typeof CandidateListingSchema>[], apiKey: string) {
  if (candidates.length <= 1) return { listings: candidates.map(normalizeListing) };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You merge e-commerce draft listings. Combine only entries that clearly represent the same product/model. Keep different products separate.",
        },
        {
          role: "user",
          content: `Merge duplicate candidates when they represent the same product.
Return compact final listings using the merge_product_listings tool.

Candidates:
${JSON.stringify(candidates, null, 2)}`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "merge_product_listings",
          description: "Return merged product listings",
          parameters: {
            type: "object",
            properties: {
              listings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string", enum: [...categories] },
                    price: { type: "number" },
                    currency: { type: "string" },
                    sourceIds: { type: "array", items: { type: "string" } },
                    images: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "description", "category", "price", "currency", "sourceIds", "images"],
                  additionalProperties: false,
                },
              },
            },
            required: ["listings"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "merge_product_listings" } },
      reasoning: { effort: "low" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("AI merge error:", response.status, errorBody);
    return { errorStatus: response.status, errorBody, listings: candidates.map(normalizeListing) };
  }

  const data = await safeJson(response);
  const args = parseToolArguments(data);
  const listings = Array.isArray(args?.listings) ? args.listings.map(normalizeListing).filter((item: any) => item.images.length > 0 || item.sourceIds.length > 0) : [];
  return { listings: listings.length > 0 ? listings : candidates.map(normalizeListing) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const payload = parsed.data;
    const result = payload.mode === "merge"
      ? await mergeCandidates(payload.candidates, LOVABLE_API_KEY)
      : await analyzeImages(payload.images, LOVABLE_API_KEY);

    if (result.errorStatus === 429) {
      return new Response(JSON.stringify({ error: "AI rate limit. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.errorStatus === 402) {
      return new Response(JSON.stringify({ error: "AI credits depleted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.errorStatus) {
      return new Response(JSON.stringify({ error: "AI image analysis failed.", details: result.errorBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, listings: result.listings || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("ai-bulk-detect-products error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
