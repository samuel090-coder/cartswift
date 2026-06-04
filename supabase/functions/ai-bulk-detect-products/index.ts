import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";

const categories = ["fashion", "books", "tools", "vehicles", "animals"] as const;
const categoryKeywords: Record<(typeof categories)[number], string[]> = {
  fashion: ["fashion", "clothing", "apparel", "shoe", "shoes", "sneaker", "heel", "heels", "boot", "boots", "sandal", "sandals", "bag", "handbag", "purse", "dress", "shirt", "watch", "jewelry", "jacket"],
  books: ["book", "books", "novel", "textbook", "magazine", "comic", "guide", "manual"],
  tools: ["tool", "tools", "equipment", "machine", "hardware", "kit", "device", "appliance", "gadget"],
  vehicles: ["vehicle", "vehicles", "car", "cars", "toyota", "honda", "bmw", "mercedes", "lamborghini", "truck", "bike", "bicycle", "motorcycle", "scooter", "van", "bus", "suv", "sedan", "pickup"],
  animals: ["animal", "animals", "pet", "pets", "dog", "cat", "bird", "fish", "horse", "puppy", "kitten"],
};

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

const toText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
};

const parseJsonObject = (text: string) => {
  const candidates = [
    text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1],
    text.match(/\{[\s\S]*\}/)?.[0],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return {};
};

const inferCategoryScores = (text: string) =>
  categories.reduce((acc, category) => {
    acc[category] = categoryKeywords[category].reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
    return acc;
  }, {} as Record<(typeof categories)[number], number>);

const normalizeCategory = (...parts: unknown[]): (typeof categories)[number] => {
  const [rawCategory, ...contextParts] = parts.map((part) => String(part || "").toLowerCase().trim());
  const context = contextParts.filter(Boolean).join(" ");
  const scores = inferCategoryScores(`${rawCategory} ${context}`.trim());
  const inferred = categories.reduce((best, category) => (scores[category] > scores[best] ? category : best), "tools" as (typeof categories)[number]);
  const rawIsKnown = categories.includes(rawCategory as (typeof categories)[number]);
  const rawScore = rawIsKnown ? scores[rawCategory as (typeof categories)[number]] : -1;
  const inferredScore = scores[inferred];

  if (inferredScore > Math.max(rawScore, 0)) return inferred;
  if (rawIsKnown) return rawCategory as (typeof categories)[number];
  if (inferredScore > 0) return inferred;
  return "tools";
};

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

  const parsedFromContent = parseJsonObject(toText(message?.content));
  if (Object.keys(parsedFromContent).length > 0) return parsedFromContent;

  return {};
};

const normalizeListing = (listing: any) => ({
  title: String(listing?.title || "Uploaded Product").trim() || "Uploaded Product",
  description: String(listing?.description || "Review this AI-generated draft before posting.").trim(),
  category: normalizeCategory(listing?.category, listing?.title, listing?.description),
  price: Number.isFinite(Number(listing?.price)) ? Math.max(1, Number(listing.price)) : 0,
  currency: String(listing?.currency || "USD").trim() || "USD",
  images: Array.from(new Set(Array.isArray(listing?.images) ? listing.images.filter(Boolean) : [])),
  sourceIds: Array.from(new Set(Array.isArray(listing?.sourceIds) ? listing.sourceIds.filter(Boolean) : [])),
});

async function analyzeImages(images: z.infer<typeof AnalyzeImageSchema>[], apiKey: string) {
  const content: any[] = [
    {
      type: "text",
      text: `You are the same high-quality product analyzer used for the manual admin add-product AI flow.
Analyze every uploaded image carefully and create polished e-commerce drafts.

Rules:
- Group only images that clearly show the same exact product or same product model from different angles.
- Keep different products separate.
- For every listing, return a real product name based on what is visibly present in the images. Do not use generic placeholders like Uploaded Product, Product, Item, Goods, or file names.
- Write a professional buyer-facing description that sounds ready for a real storefront.
- Estimate a realistic market price in USD.
- Choose the closest category from: fashion, books, tools, vehicles, animals.
- Shoes, heels, sneakers, sandals, clothing, watches, bags, and accessories must be fashion.
- Cars, motorcycles, bicycles, trucks, buses, and auto parts must be vehicles.
- Use the given public image URLs in the images array and the related sourceIds for each listing.
- Never return an empty result when clear product photos exist.`,
    },
  ];

  images.forEach((image, index) => {
    content.push({ type: "text", text: `Image ${index + 1}\nsourceId: ${image.sourceId}\nfilename: ${image.name}\npublicUrl: ${image.url}` });
    content.push({ type: "image_url", image_url: { url: image.dataUrl || image.url } });
  });

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You are a senior e-commerce copywriter and visual product classifier. Return structured, usable listing drafts only, with specific names, proper categories, and realistic prices.",
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
                    category: { type: "string" },
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
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("AI analyze error:", response.status, errorBody);
    return { errorStatus: response.status, errorBody };
  }

  const data = await safeJson(response);
  const args = parseToolArguments(data);
  if (!Array.isArray(args?.listings)) {
    console.warn("AI analyze returned no structured listings", JSON.stringify(data)?.slice(0, 1200));
  }
  const listings = Array.isArray(args?.listings)
    ? args.listings
        .map((listing: any) => normalizeListing({
          ...listing,
          category: normalizeCategory(listing?.category, listing?.title, listing?.description),
        }))
        .filter((item: any) => item.images.length > 0 || item.sourceIds.length > 0)
        .filter((item: any) => item.title.toLowerCase() !== "uploaded product")
    : [];

  if (listings.length > 0) return { listings };

  return {
    listings: images.map((image) => normalizeListing({
      title: String(image.name || "Uploaded image").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Product",
      description: "AI could not fully classify this image, so a fallback draft was created. Review the details before posting.",
      category: normalizeCategory(image.name),
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
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You merge e-commerce draft listings. Combine only entries that clearly represent the same product or same model. Keep different products separate and preserve the best professional title, description, category, and realistic price.",
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
                    category: { type: "string" },
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
  const listings = Array.isArray(args?.listings)
    ? args.listings.map((listing: any) => normalizeListing({
        ...listing,
        category: normalizeCategory(listing?.category, listing?.title, listing?.description),
      })).filter((item: any) => item.images.length > 0 || item.sourceIds.length > 0)
    : [];
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
