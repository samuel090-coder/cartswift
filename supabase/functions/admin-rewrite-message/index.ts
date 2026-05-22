import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const systemPrompt = `You are a professional copy editor for a customer support team. Rewrite the agent's draft message into clear, polite, professional English with correct grammar and punctuation. Keep the original meaning, keep it concise, do not add new information, do not greet again if not in the draft, do not add a signature. Return ONLY the rewritten message text with no quotes or commentary.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("rewrite error", r.status, t);
      return new Response(JSON.stringify({ rewritten: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const rewritten = (j.choices?.[0]?.message?.content || text).trim();
    return new Response(JSON.stringify({ rewritten }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "fail" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
