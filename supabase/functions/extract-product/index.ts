import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 1. Scrape with Firecrawl v2
    console.log("Scraping URL:", url);
    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!fcRes.ok) {
      const errText = await fcRes.text();
      console.error("Firecrawl error:", fcRes.status, errText);
      if (fcRes.status === 402) {
        return new Response(JSON.stringify({ error: "Firecrawl credits exhausted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to scrape URL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fcData = await fcRes.json();
    const markdown: string = fcData?.data?.markdown || fcData?.markdown || "";
    const metadata = fcData?.data?.metadata || fcData?.metadata || {};

    // Collect candidate image URLs from markdown
    const imgRegex = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
    const candidateImages: string[] = [];
    let m;
    while ((m = imgRegex.exec(markdown)) !== null) {
      const u = m[1];
      if (!candidateImages.includes(u) && /\.(jpe?g|png|webp|gif)/i.test(u)) {
        candidateImages.push(u);
      }
    }
    if (metadata.ogImage && !candidateImages.includes(metadata.ogImage)) {
      candidateImages.unshift(metadata.ogImage);
    }

    // 2. Use AI to extract structured product info
    console.log("Extracting product info with AI...");
    const truncated = markdown.slice(0, 12000);
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a product data extraction assistant. Extract clean structured info from scraped e-commerce page content.",
          },
          {
            role: "user",
            content: `Extract the product details from this scraped page.\n\nPage Title: ${metadata.title || ""}\n\nContent:\n${truncated}\n\nReturn the product info using the extract_product tool.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_product",
            description: "Return structured product data",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Clean product name" },
                description: { type: "string", description: "Detailed product description, 2-4 sentences" },
                price: { type: "number", description: "Numeric price (no currency symbol)" },
                currency: { type: "string", description: "ISO currency code like USD, EUR, NGN, GBP" },
                category: { type: "string", enum: ["fashion", "books", "tools", "vehicles", "animals"], description: "Best matching category" },
              },
              required: ["title", "description"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    // 3. Download top images and re-upload to storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const uploadedImages: string[] = [];
    const imagesToUpload = candidateImages.slice(0, 5);

    for (const imgUrl of imagesToUpload) {
      try {
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) continue;
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        if (buf.length < 1000 || buf.length > 10 * 1024 * 1024) continue; // skip tiny/huge
        const fileName = `extracted/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("item-images")
          .upload(fileName, buf, { contentType, upsert: false });
        if (upErr) {
          console.error("Image upload error:", upErr);
          continue;
        }
        const { data: pub } = supabase.storage.from("item-images").getPublicUrl(fileName);
        uploadedImages.push(pub.publicUrl);
      } catch (e) {
        console.error("Image fetch failed:", imgUrl, e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      product: {
        title: args.title || metadata.title || "",
        description: args.description || metadata.description || "",
        price: args.price ?? null,
        currency: args.currency || "USD",
        category: args.category || "tools",
        images: uploadedImages,
        source_url: url,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-product error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
