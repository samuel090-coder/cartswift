import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SHIPPING_NGN = 10000;

const REWARD_POOL = [
  { title: 'Apple iPhone 15 Pro', category: 'Electronics', price_ngn: 1800000, image: 'https://images.unsplash.com/photo-1696446702183-be9605e40c25?w=1024&q=80' },
  { title: 'Beats Studio Pro Headphones', category: 'Electronics', price_ngn: 180000, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=1024&q=80' },
  { title: 'Premium Wireless Earbuds', category: 'Electronics', price_ngn: 250000, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1024&q=80' },
  { title: 'Smart Fitness Watch', category: 'Electronics', price_ngn: 400000, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1024&q=80' },
  { title: 'MacBook Air M3', category: 'Electronics', price_ngn: 2100000, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1024&q=80' },
  { title: 'Designer Leather Handbag', category: 'Fashion', price_ngn: 450000, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1024&q=80' },
  { title: 'Luxury Sunglasses', category: 'Fashion', price_ngn: 180000, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1024&q=80' },
  { title: 'PlayStation 5 Console', category: 'Electronics', price_ngn: 800000, image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1024&q=80' },
  { title: 'Nike Air Jordan Sneakers', category: 'Fashion', price_ngn: 220000, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1024&q=80' },
  { title: 'Ray-Ban Aviator', category: 'Fashion', price_ngn: 180000, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1024&q=80' },
];

function fallbackCopy(p: typeof REWARD_POOL[0]) {
  return {
    description: `Claim the ${p.title} — a premium ${p.category.toLowerCase()} pick reserved just for you. Limited stock available.`,
    benefits: ['Authentic premium quality', 'Fast nationwide shipping', 'Satisfaction guaranteed', 'Delivered in premium packaging'],
    faq: [
      { q: 'Is this really free?', a: 'Yes — the product is 100% free. You only cover the ₦10,000 shipping fee.' },
      { q: 'When will it ship?', a: 'Orders ship within 24-48 hours after checkout.' },
      { q: 'Can I return it?', a: 'Yes, 30-day hassle-free returns.' },
    ],
  };
}

async function generateCopy(product: typeof REWARD_POOL[0]) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Write premium, exciting, honest marketing copy. Return strictly valid JSON.' },
          { role: 'user', content: `Product: ${product.title} (${product.category}). Return JSON: {"description":"2-sentence premium description","benefits":["4 short benefit bullets"],"faq":[{"q":"...","a":"..."} x3]}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return fallbackCopy(product);
    const json = await res.json();
    const parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? '{}');
    if (!parsed.description) return fallbackCopy(product);
    return parsed;
  } catch {
    return fallbackCopy(product);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sessionId, userId, interests } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Enforce one reward per account (DB-backed, not localStorage)
    const { data: existing } = await admin
      .from('reward_claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ claim: existing, existing: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let pool = REWARD_POOL;
    if (Array.isArray(interests) && interests.length) {
      const match = REWARD_POOL.filter(p => interests.includes(p.category));
      if (match.length) pool = match;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const copy = await generateCopy(pick);

    const primary_reward = {
      title: pick.title,
      category: pick.category,
      original_price_ngn: pick.price_ngn,
      original_price: pick.price_ngn, // display value (NGN)
      image_url: pick.image,
      description: copy.description,
      benefits: copy.benefits,
      faq: copy.faq,
      rarity: Math.random() < 0.15 ? 'legendary' : Math.random() < 0.4 ? 'rare' : 'common',
    };

    const { data, error } = await admin.from('reward_claims').insert({
      session_id: sessionId || crypto.randomUUID(),
      user_id: userId,
      primary_reward,
      shipping_fee: SHIPPING_NGN,
      currency: 'NGN',
      status: 'pending',
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    }).select().single();

    if (error) {
      // Race: another insert won the unique index -> return existing
      if (String(error.message).includes('reward_claims_user_id_unique')) {
        const { data: again } = await admin.from('reward_claims').select('*').eq('user_id', userId).maybeSingle();
        return new Response(JSON.stringify({ claim: again, existing: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw error;
    }
    return new Response(JSON.stringify({ claim: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
