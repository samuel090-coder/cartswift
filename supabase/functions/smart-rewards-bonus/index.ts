import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-image-2', prompt, size: '1024x1024', quality: 'low', n: 1 }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch { return null; }
}

async function aiSuggest(primary: any): Promise<any[]> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You recommend perfectly complementary premium products. Return strictly valid JSON only.' },
        { role: 'user', content: `Primary reward: ${primary.title} (${primary.category}). Suggest 3 complementary premium products that pair perfectly. Return JSON: {"items":[{"title":"...","category":"...","original_price":number,"discount_price":number,"reason":"why it complements","image_prompt":"detailed studio product photography prompt, dark gradient background","rarity":"common|rare|legendary"}]}` },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? '{"items":[]}';
  const parsed = JSON.parse(text);
  return parsed.items ?? [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { claimId } = await req.json();
    if (!claimId) return new Response(JSON.stringify({ error: 'claimId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Return existing bundle if present
    const existing = await admin.from('reward_bonus_bundles').select('*').eq('claim_id', claimId).maybeSingle();
    if (existing.data) return new Response(JSON.stringify({ bundle: existing.data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const claim = await admin.from('reward_claims').select('*').eq('id', claimId).single();
    if (claim.error) throw claim.error;

    const suggestions = await aiSuggest(claim.data.primary_reward);
    const enriched = await Promise.all(suggestions.slice(0, 3).map(async (s: any) => ({
      ...s,
      image_url: await generateImage(s.image_prompt || `${s.title} premium product photography dark gradient background`),
    })));

    const totalDiscount = enriched.reduce((sum, i) => sum + (Number(i.discount_price) || 0), 0);

    const { data, error } = await admin.from('reward_bonus_bundles').insert({
      claim_id: claimId,
      bonus_items: enriched,
      status: 'pending',
      amount_paid: totalDiscount,
      currency: claim.data.currency || 'USD',
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ bundle: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
