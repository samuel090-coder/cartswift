import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resolve a possibly-relative URL against a base
function absoluteUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

// Pick the highest-resolution candidate from a srcset string
function pickFromSrcset(srcset: string): string | null {
  const parts = srcset.split(",").map((p) => p.trim()).filter(Boolean);
  let best: { url: string; w: number } | null = null;
  for (const p of parts) {
    const [u, size] = p.split(/\s+/);
    const w = size?.endsWith("w") ? parseInt(size) : size?.endsWith("x") ? parseFloat(size) * 1000 : 0;
    if (!best || w > best.w) best = { url: u, w };
  }
  return best?.url ?? null;
}

function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const abs = absoluteUrl(raw.trim(), baseUrl);
    if (!abs) return;
    if (seen.has(abs)) return;
    seen.add(abs);
    out.push(abs);
  };

  // <img ...>
  const imgTagRe = /<img\b[^>]*>/gi;
  let tag;
  while ((tag = imgTagRe.exec(html)) !== null) {
    const t = tag[0];
    const srcset = /\bsrcset\s*=\s*["']([^"']+)["']/i.exec(t)?.[1];
    const dataSrcset = /\bdata-srcset\s*=\s*["']([^"']+)["']/i.exec(t)?.[1];
    const dataSrc = /\bdata-src\s*=\s*["']([^"']+)["']/i.exec(t)?.[1];
    const dataLazy = /\bdata-(?:lazy|original|zoom-image|a-dynamic-image)\s*=\s*["']([^"']+)["']/i.exec(t)?.[1];
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(t)?.[1];

    if (srcset) push(pickFromSrcset(srcset));
    if (dataSrcset) push(pickFromSrcset(dataSrcset));
    push(dataSrc);
    if (dataLazy) {
      // Amazon's data-a-dynamic-image is a JSON map of url->[w,h]
      try {
        const parsed = JSON.parse(dataLazy);
        if (parsed && typeof parsed === "object") {
          for (const k of Object.keys(parsed)) push(k);
        } else {
          push(dataLazy);
        }
      } catch {
        push(dataLazy);
      }
    }
    push(src);
  }

  // <source srcset="..."> inside <picture>
  const sourceRe = /<source\b[^>]*\bsrcset\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let s;
  while ((s = sourceRe.exec(html)) !== null) {
    push(pickFromSrcset(s[1]));
  }

  // og:image / twitter:image meta tags
  const metaRe = /<meta\b[^>]*?(?:property|name)\s*=\s*["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*?\bcontent\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let mm;
  while ((mm = metaRe.exec(html)) !== null) push(mm[1]);

  return out;
}

function looksLikeProductImage(u: string): boolean {
  const lower = u.toLowerCase();
  if (/(sprite|placeholder|blank\.|pixel\.|1x1\.|spacer|loading\.|spinner|favicon|\/icons?\/|\/logo)/i.test(lower)) return false;
  // Must be an image extension OR have image-y query params (e.g. ?format=jpg)
  if (!/\.(jpe?g|png|webp|gif|avif)(\?|$|#)/i.test(lower) && !/(image|format=jpe?g|format=png|format=webp)/i.test(lower)) return false;
  return true;
}

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
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 1. Scrape with Firecrawl v2 — request HTML so we can parse real <img> tags & srcsets
    console.log("Scraping URL:", url);
    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: false, // include picture/source tags often outside main
        waitFor: 1500,
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
    const html: string = fcData?.data?.html || fcData?.html || fcData?.data?.rawHtml || fcData?.rawHtml || "";
    const metadata = fcData?.data?.metadata || fcData?.metadata || {};
    const sourceUrl: string = metadata.sourceURL || metadata.url || url;

    // Extract images from HTML (highest fidelity)
    const htmlImages = extractImagesFromHtml(html, sourceUrl);

    // Also pull from markdown as a fallback
    const mdImages: string[] = [];
    const imgRegex = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
    let m;
    while ((m = imgRegex.exec(markdown)) !== null) {
      const abs = absoluteUrl(m[1], sourceUrl);
      if (abs && !mdImages.includes(abs)) mdImages.push(abs);
    }

    // Combine: HTML first (better), then markdown, then ogImage
    const ogImg = metadata.ogImage ? absoluteUrl(metadata.ogImage, sourceUrl) : null;
    const allImages: string[] = [];
    const seen = new Set<string>();
    for (const u of [...(ogImg ? [ogImg] : []), ...htmlImages, ...mdImages]) {
      if (!seen.has(u)) { seen.add(u); allImages.push(u); }
    }

    const filteredImages = allImages.filter(looksLikeProductImage);
    console.log(`Found ${allImages.length} candidate images, ${filteredImages.length} after filtering.`);

    // 2. Use AI to extract structured product info AND choose the best images
    console.log("Extracting product info with AI...");
    const truncated = markdown.slice(0, 12000);
    const imagesForAI = filteredImages.slice(0, 25);

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
            content: "You extract clean structured product data from scraped e-commerce pages. When choosing images, return ONLY URLs that depict the actual product (NOT logos, banners, recommended/related products, ads, icons, payment badges, or category thumbnails). Pick from the provided list ONLY — do NOT invent URLs.",
          },
          {
            role: "user",
            content: `Extract the product details from this scraped page.

Page Title: ${metadata.title || ""}
Source URL: ${sourceUrl}

Candidate image URLs (pick 1-5 that show the actual product, in order of relevance — main hero shot first):
${imagesForAI.map((u, i) => `${i + 1}. ${u}`).join("\n")}

Markdown content:
${truncated}

Return the product info using the extract_product tool.`,
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
                selected_images: {
                  type: "array",
                  items: { type: "string" },
                  description: "1 to 5 image URLs from the candidate list that show the actual product. Hero/main image first.",
                },
              },
              required: ["title", "description", "selected_images"],
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

    // Validate AI-selected images: must be in our candidate list (no hallucinations)
    const candidateSet = new Set(filteredImages);
    let chosen: string[] = Array.isArray(args.selected_images)
      ? args.selected_images.filter((u: string) => candidateSet.has(u))
      : [];

    // Fallback: if AI returned nothing valid, use top filtered images
    if (chosen.length === 0) chosen = filteredImages.slice(0, 5);
    chosen = chosen.slice(0, 5);

    return new Response(JSON.stringify({
      success: true,
      product: {
        title: args.title || metadata.title || "",
        description: args.description || metadata.description || "",
        price: args.price ?? null,
        currency: args.currency || "USD",
        category: args.category || "tools",
        images: chosen,
        source_url: url,
      },
      debug: {
        candidate_count: allImages.length,
        filtered_count: filteredImages.length,
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
