import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrls } = await req.json();
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "imageUrls array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userContent: any[] = [
      {
        type: "text",
        text: `You are an expert e-commerce product cataloguer. I'm giving you ${imageUrls.length} product image(s) indexed 0..${imageUrls.length - 1}.

Your job:
1. Detect each distinct product across the images.
2. GROUP images that show the SAME product (even if different angles or different colors of the exact same model) into ONE listing — return all their indexes in image_indexes.
3. Treat clearly different products (e.g. a Lamborghini vs a Peugeot, or a pot vs a shoe) as SEPARATE listings.
4. For each listing: compelling title (max 70 chars), 2-4 sentence customer-facing description, BEST matching category from [fashion, books, tools, vehicles, animals] (pick the closest fit), and realistic market price in USD as a number.
5. Return ONE entry per distinct product.`,
      },
    ];
    imageUrls.forEach((url: string, i: number) => {
      userContent.push({ type: "text", text: `Image index ${i}:` });
      userContent.push({ type: "image_url", image_url: { url } });
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: userContent }],
        tools: [{
          type: "function",
          function: {
            name: "bulk_product_listings",
            description: "Return grouped product listings detected from the images",
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
                      category: { type: "string", enum: ["fashion", "books", "tools", "vehicles", "animals"] },
                      price: { type: "number", description: "Estimated market price in USD" },
                      image_indexes: { type: "array", items: { type: "integer" } },
                    },
                    required: ["title", "description", "category", "price", "image_indexes"],
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

    if (!res.ok) {
      const t = await res.text();
      console.error("AI error:", res.status, t);
      if (res.status === 429) return new Response(JSON.stringify({ error: "AI rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { listings: [] };

    const listings = (args.listings || []).map((l: any) => ({
      title: l.title || "Untitled product",
      description: l.description || "",
      category: l.category || "tools",
      price: Number(l.price) || 0,
      currency: "USD",
      images: (l.image_indexes || []).map((i: number) => imageUrls[i]).filter(Boolean),
    })).filter((l: any) => l.images.length > 0);

    return new Response(JSON.stringify({ success: true, listings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-bulk-detect-products error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
