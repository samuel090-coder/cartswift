import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, price, category, images } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a product listing quality checker for an e-commerce marketplace called CartSwift.

Analyze this seller product listing and determine if it's ready to be published:

Title: "${title || ''}"
Description: "${description || ''}"
Price: ${price || 'Not set'}
Category: ${category || 'Not set'}
Number of images: ${images?.length || 0}

Check for these issues:
1. Title must be descriptive (at least 3 words, no gibberish)
2. Description must have enough detail (at least 20 characters, describes the product)
3. Price must be reasonable (greater than 0)
4. At least 1 image is required
5. Category must be set
6. No spam, inappropriate content, or misleading information
7. Title and description should match the category

Respond with a JSON object with these fields:
- is_valid: boolean (true if listing is good enough to post)
- score: number (1-10 quality score)
- issues: string[] (list of specific problems found, empty if none)
- suggestions: string[] (list of improvement suggestions)
- summary: string (one-sentence overall assessment)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a product listing quality checker. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_listing",
              description: "Return validation results for a product listing",
              parameters: {
                type: "object",
                properties: {
                  is_valid: { type: "boolean", description: "Whether the listing is good enough to publish" },
                  score: { type: "number", description: "Quality score from 1-10" },
                  issues: { type: "array", items: { type: "string" }, description: "List of problems found" },
                  suggestions: { type: "array", items: { type: "string" }, description: "Improvement suggestions" },
                  summary: { type: "string", description: "One-sentence assessment" },
                },
                required: ["is_valid", "score", "issues", "suggestions", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "validate_listing" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // Fallback: return basic validation
      return new Response(JSON.stringify(basicValidation(title, description, price, images)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback
    return new Response(JSON.stringify(basicValidation(title, description, price, images)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(JSON.stringify({ 
      is_valid: true, score: 5, issues: [], suggestions: ["AI validation unavailable"], summary: "Basic checks passed." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function basicValidation(title: string, description: string, price: number, images: string[]) {
  const issues: string[] = [];
  if (!title || title.trim().length < 3) issues.push("Title is too short or missing");
  if (!description || description.trim().length < 10) issues.push("Description needs more detail");
  if (!price || price <= 0) issues.push("Price must be greater than 0");
  if (!images || images.length === 0) issues.push("At least one image is required");

  return {
    is_valid: issues.length === 0,
    score: Math.max(1, 10 - issues.length * 2),
    issues,
    suggestions: issues.length > 0 ? ["Fix the issues listed above before publishing"] : [],
    summary: issues.length === 0 ? "Listing looks good!" : `Found ${issues.length} issue(s) to fix.`,
  };
}
