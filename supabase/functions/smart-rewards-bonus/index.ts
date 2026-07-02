import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FALLBACK_BONUS: Record<string, any[]> = {
  Electronics: [
    { title: 'Premium Phone Case', category: 'Electronics', original_price: 49, discount_price: 19, reason: 'Perfect protection for your device', image_url: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=800&q=80', rarity: 'common' },
    { title: 'Fast Wireless Charger', category: 'Electronics', original_price: 79, discount_price: 29, reason: 'Effortless charging companion', image_url: 'https://images.unsplash.com/photo-1633269540827-728aabbb7646?w=800&q=80', rarity: 'rare' },
    { title: 'Premium USB-C Cable Set', category: 'Electronics', original_price: 39, discount_price: 15, reason: 'Reliable fast-charging cables', image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80', rarity: 'common' },
  ],
  Fashion: [
    { title: 'Luxury Leather Wallet', category: 'Fashion', original_price: 89, discount_price: 29, reason: 'Complements your style effortlessly', image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80', rarity: 'rare' },
    { title: 'Premium Silk Scarf', category: 'Fashion', original_price: 69, discount_price: 25, reason: 'Elegant accessory for any occasion', image_url: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80', rarity: 'common' },
    { title: 'Designer Belt', category: 'Fashion', original_price: 119, discount_price: 39, reason: 'Timeless design meets premium leather', image_url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80', rarity: 'rare' },
  ],
  Beauty: [
    { title: 'Luxury Face Serum', category: 'Beauty', original_price: 99, discount_price: 35, reason: 'Deep hydration for radiant skin', image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80', rarity: 'rare' },
    { title: 'Premium Makeup Brush Set', category: 'Beauty', original_price: 79, discount_price: 29, reason: 'Professional finish, every time', image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', rarity: 'common' },
    { title: 'Aromatherapy Diffuser', category: 'Home', original_price: 59, discount_price: 22, reason: 'Relaxing spa vibes at home', image_url: 'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800&q=80', rarity: 'common' },
  ],
};

function getFallback(category: string) {
  return FALLBACK_BONUS[category] ?? FALLBACK_BONUS.Electronics;
}

async function aiSuggest(primary: any): Promise<any[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You recommend perfectly complementary premium products. Return strictly valid JSON only.' },
          { role: 'user', content: `Primary reward: ${primary.title} (${primary.category}). Suggest 3 complementary premium products. Return JSON: {"items":[{"title":"...","category":"...","original_price":number,"discount_price":number,"reason":"...","rarity":"common|rare|legendary"}]}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? '{"items":[]}';
    return JSON.parse(text).items ?? [];
  } catch (e) {
    console.error('bonus ai error', e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { claimId } = await req.json();
    if (!claimId) return new Response(JSON.stringify({ error: 'claimId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const existing = await admin.from('reward_bonus_bundles').select('*').eq('claim_id', claimId).maybeSingle();
    if (existing.data) return new Response(JSON.stringify({ bundle: existing.data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const claim = await admin.from('reward_claims').select('*').eq('id', claimId).single();
    if (claim.error) throw claim.error;

    const primary = claim.data.primary_reward;
    const fallback = getFallback(primary.category);

    const aiItems = await aiSuggest(primary);
    // Merge AI suggestions with curated fallback images (AI rarely returns valid images)
    const enriched = (aiItems.length >= 3 ? aiItems : fallback).slice(0, 3).map((s: any, i: number) => ({
      ...s,
      image_url: s.image_url || fallback[i % fallback.length].image_url,
    }));

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
