import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Curated pool of desirable rewards with high-quality Unsplash images (instant, no AI wait)
const REWARD_POOL = [
  { title: 'Apple iPhone 15 Pro', category: 'Electronics', price: 1099, image: 'https://images.unsplash.com/photo-1696446702183-be9605e40c25?w=1024&q=80' },
  { title: 'Premium Wireless Earbuds', category: 'Electronics', price: 249, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1024&q=80' },
  { title: 'Smart Fitness Watch', category: 'Electronics', price: 399, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1024&q=80' },
  { title: 'MacBook Air M3', category: 'Electronics', price: 1299, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1024&q=80' },
  { title: 'Designer Leather Handbag', category: 'Fashion', price: 459, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1024&q=80' },
  { title: 'Luxury Sunglasses', category: 'Fashion', price: 189, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1024&q=80' },
  { title: 'Portable Bluetooth Speaker', category: 'Electronics', price: 129, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1024&q=80' },
  { title: 'Premium Skincare Set', category: 'Beauty', price: 199, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1024&q=80' },
  { title: 'PlayStation 5 Console', category: 'Electronics', price: 499, image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1024&q=80' },
  { title: 'Nike Air Jordan Sneakers', category: 'Fashion', price: 219, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1024&q=80' },
  { title: 'Ray-Ban Aviator', category: 'Fashion', price: 179, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1024&q=80' },
  { title: 'Wireless Charging Pad', category: 'Electronics', price: 79, image: 'https://images.unsplash.com/photo-1633269540827-728aabbb7646?w=1024&q=80' },
];

function fallbackCopy(p: typeof REWARD_POOL[0]) {
  return {
    description: `Claim the ${p.title} — a premium ${p.category.toLowerCase()} pick we've reserved just for you. Limited stock available.`,
    benefits: ['Authentic premium quality', 'Fast worldwide shipping', 'Backed by our satisfaction guarantee', 'Delivered in premium packaging'],
    faq: [
      { q: 'Is this really free?', a: 'Yes — the product is 100% free. You only cover the $5 shipping fee.' },
      { q: 'When will it ship?', a: 'Orders ship within 24-48 hours after checkout.' },
      { q: 'Can I return it?', a: 'Yes, 30-day hassle-free returns.' },
    ],
  };
}

async function generateCopy(product: typeof REWARD_POOL[0]): Promise<ReturnType<typeof fallbackCopy>> {
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
    const text = json?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(text);
    if (!parsed.description) return fallbackCopy(product);
    return parsed;
  } catch (e) {
    console.error('copy gen error', e);
    return fallbackCopy(product);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sessionId, interests } = await req.json();
    if (!sessionId) return new Response(JSON.stringify({ error: 'sessionId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
      original_price: pick.price,
      image_url: pick.image,
      description: copy.description,
      benefits: copy.benefits,
      faq: copy.faq,
      rarity: Math.random() < 0.15 ? 'legendary' : Math.random() < 0.4 ? 'rare' : 'common',
    };

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await admin.from('reward_claims').insert({
      session_id: sessionId,
      primary_reward,
      shipping_fee: 5,
      currency: 'USD',
      status: 'pending',
    }).select().single();

    if (error) throw error;
    return new Response(JSON.stringify({ claim: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
