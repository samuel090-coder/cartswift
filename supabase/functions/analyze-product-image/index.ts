import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const categories = ["fashion", "books", "tools", "vehicles", "animals"] as const;

const categoryKeywords: Record<(typeof categories)[number], string[]> = {
  fashion: ["fashion", "clothing", "apparel", "shoe", "shoes", "sneaker", "heel", "heels", "boot", "boots", "sandal", "sandals", "bag", "handbag", "purse", "dress", "shirt", "watch", "jewelry", "jacket"],
  books: ["book", "books", "novel", "textbook", "magazine", "comic", "guide", "manual"],
  tools: ["tool", "tools", "equipment", "machine", "hardware", "kit", "device", "appliance", "gadget"],
  vehicles: ["vehicle", "vehicles", "car", "cars", "toyota", "honda", "bmw", "mercedes", "lamborghini", "truck", "bike", "bicycle", "motorcycle", "scooter", "van", "bus", "suv", "sedan"],
  animals: ["animal", "animals", "pet", "pets", "dog", "cat", "bird", "fish", "horse", "puppy", "kitten"],
};

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

const parseToolArgs = (data: any) => {
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.error("tool args parse error", error);
    }
  }

  return parseJsonObject(toText(data?.choices?.[0]?.message?.content));
};

const normalizeCategory = (...parts: unknown[]): (typeof categories)[number] => {
  const raw = parts
    .map((part) => String(part || "").toLowerCase())
    .join(" ")
    .trim();

  if (!raw) return "tools";
  if (categories.includes(raw as (typeof categories)[number])) return raw as (typeof categories)[number];

  for (const category of categories) {
    if (categoryKeywords[category].some((keyword) => raw.includes(keyword))) return category;
  }

  return "tools";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_completion_tokens: 1200,
        messages: [
          {
            role: "system",
            content: "You are a senior e-commerce copywriter and product classifier. Look at the product image and produce a real product title based on what is visible in the image, not a placeholder. Use brand/model clues only when they are visually plausible. Write a professional customer-facing description in 2-4 sentences and estimate a realistic market price in USD. Also pick the closest existing category.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this product image and return a professional listing with a real product name, description, estimated USD price, currency, and closest category. Do not return placeholders like Uploaded Product." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "product_listing",
            description: "Return product listing copy",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Compelling product title, max 70 chars" },
                description: { type: "string", description: "2-4 sentence customer-facing description" },
                price: { type: "number", description: "Estimated market price in USD" },
                currency: { type: "string", description: "Currency code, usually USD" },
                category: { type: "string", enum: ["fashion", "books", "tools", "vehicles", "animals"] },
              },
              required: ["title", "description", "category", "price", "currency"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "product_listing" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI error:", res.status, t);
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const args = parseToolArgs(data);

    console.log("analyze-product-image result", JSON.stringify({
      hasTitle: Boolean(args.title),
      hasDescription: Boolean(args.description),
      price: args.price,
      category: args.category,
      finishReason: data?.choices?.[0]?.finish_reason ?? null,
    }));

    return new Response(JSON.stringify({
      success: true,
      title: args.title || "",
      description: args.description || "",
      price: Number.isFinite(Number(args.price)) ? Math.max(0, Number(args.price)) : 0,
      currency: String(args.currency || "USD").trim() || "USD",
      category: normalizeCategory(args.category, args.title, args.description),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-product-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
