import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SHIPPING_NGN = 10000;
const MAX_REFRESHES = 3;

// 10+ premium fallback sets — every item is desirable.
const REWARD_POOL: Array<{ title: string; category: string; price_ngn: number; image: string; description: string; benefits: string[] }> = [
  { title: 'Apple iPhone 15 Pro (256GB)', category: 'Smartphones', price_ngn: 1_800_000, image: 'https://images.unsplash.com/photo-1696446702183-be9605e40c25?w=1024&q=80',
    description: 'The latest titanium-frame iPhone with the A17 Pro chip and pro-grade camera system.',
    benefits: ['Titanium design', 'A17 Pro chipset', 'Pro camera system', '1-year warranty'] },
  { title: 'MacBook Air M3 (13")', category: 'Laptops', price_ngn: 2_100_000, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1024&q=80',
    description: 'Ultra-thin M3 MacBook Air with all-day battery and Liquid Retina display.',
    benefits: ['Apple M3 chip', '18-hour battery', 'Liquid Retina display', 'Sealed retail box'] },
  { title: 'PlayStation 5 Slim Console', category: 'Gaming', price_ngn: 800_000, image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1024&q=80',
    description: 'Next-gen PS5 Slim with ultra-fast SSD, DualSense controller, and 4K gaming.',
    benefits: ['4K HDR gaming', 'DualSense controller', 'Ultra-fast SSD', 'Free game voucher'] },
  { title: 'Apple Watch Series 9 (GPS)', category: 'Smartwatches', price_ngn: 400_000, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1024&q=80',
    description: 'Bright Retina display, health sensors, and the new Double Tap gesture.',
    benefits: ['Always-On Retina', 'ECG + Blood O₂', 'Fitness tracking', '1-year warranty'] },
  { title: 'Louis-Style Designer Handbag', category: 'Luxury Fashion', price_ngn: 450_000, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1024&q=80',
    description: 'Hand-crafted premium leather tote with signature hardware and dust bag.',
    benefits: ['Premium leather', 'Signature hardware', 'Dust bag & card', 'Authenticity guarantee'] },
  { title: 'Nike Air Jordan 1 Retro', category: 'Sneakers', price_ngn: 220_000, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1024&q=80',
    description: 'Iconic Air Jordan 1 Retro with premium leather and Air-Sole cushioning.',
    benefits: ['Premium leather', 'Air-Sole comfort', 'Original box + tags', 'Multiple size options'] },
  { title: 'Chanel-Style Beauty Set', category: 'Beauty', price_ngn: 180_000, image: 'https://images.unsplash.com/photo-1522335789203-aaa72775a1a3?w=1024&q=80',
    description: 'Luxury skincare and fragrance set curated for a full beauty routine.',
    benefits: ['Full skincare set', 'Signature fragrance', 'Gift-wrapped', 'Best-sellers included'] },
  { title: 'Ninja Foodi 9-in-1 Air Fryer', category: 'Kitchen', price_ngn: 260_000, image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=1024&q=80',
    description: 'Multi-cooker air fryer that pressure cooks, sears, bakes, and dehydrates.',
    benefits: ['9 cooking functions', 'Family-size 6.5L', 'Non-stick basket', '2-year warranty'] },
  { title: 'Sony WH-1000XM5 Headphones', category: 'Audio', price_ngn: 380_000, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=1024&q=80',
    description: 'Industry-leading noise-cancelling headphones with 30-hour battery life.',
    benefits: ['Best-in-class ANC', '30-hour battery', 'Crystal-clear calls', 'Premium carry case'] },
  { title: 'Ray-Ban Aviator Classic', category: 'Accessories', price_ngn: 180_000, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1024&q=80',
    description: 'The original aviator with G-15 lenses and gold-tone metal frame.',
    benefits: ['100% UV protection', 'G-15 lenses', 'Original case', 'Cleaning cloth included'] },
  { title: 'iPad Air (M2, 11")', category: 'Tablets', price_ngn: 950_000, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1024&q=80',
    description: 'Powerful and portable iPad Air with the M2 chip and Liquid Retina display.',
    benefits: ['M2 performance', 'Liquid Retina', 'Apple Pencil ready', 'Sealed retail box'] },
  { title: 'Samsung 55" QLED 4K TV', category: 'Electronics', price_ngn: 900_000, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1024&q=80',
    description: 'Quantum-dot QLED with 4K HDR, smart apps, and a slim bezel-less design.',
    benefits: ['4K HDR QLED', 'Smart apps built-in', 'Slim design', 'Wall-mount ready'] },
  { title: 'Dyson V15 Cordless Vacuum', category: 'Home', price_ngn: 620_000, image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1024&q=80',
    description: 'High-torque cordless vacuum with laser dust detection and HEPA filtration.',
    benefits: ['Laser detect', '60-min runtime', 'HEPA filtration', 'Full attachment kit'] },
];

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function generateAIBoxes(exclude: string[]): Promise<typeof REWARD_POOL | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You return only valid JSON matching the requested schema.' },
          { role: 'user', content: `Return JSON {"rewards":[{"title","category","price_ngn","image","description","benefits":["..." x 4]} x 3]} — three DIFFERENT premium desirable products (electronics, fashion, luxury, gaming, beauty, kitchen). Use real Unsplash image URLs. Exclude: ${exclude.join(', ') || 'none'}.` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? '{}');
    if (!Array.isArray(parsed.rewards) || parsed.rewards.length < 3) return null;
    return parsed.rewards.slice(0, 3);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { userId, action } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Already committed a claim? Return it so the client jumps straight to reveal.
    const { data: existingClaim } = await admin
      .from('reward_claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingClaim) {
      return new Response(JSON.stringify({ existingClaim }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: state } = await admin.from('reward_mystery_state').select('*').eq('user_id', userId).maybeSingle();
    const currentCount = state?.refresh_count ?? 0;
    const shown: string[] = state?.shown_titles ?? [];

    const isRefresh = action === 'refresh';
    if (isRefresh && currentCount >= MAX_REFRESHES) {
      return new Response(JSON.stringify({
        boxes: state?.last_boxes ?? [],
        refreshes_left: 0,
        locked: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // On initial call, if we already have last_boxes, replay them (page refresh safety).
    if (!isRefresh && state?.last_boxes && Array.isArray(state.last_boxes) && (state.last_boxes as any[]).length === 3) {
      return new Response(JSON.stringify({
        boxes: state.last_boxes,
        refreshes_left: Math.max(0, MAX_REFRESHES - currentCount),
        locked: currentCount >= MAX_REFRESHES,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build 3 rewards — AI first (soft deadline), fallback to curated pool.
    const excludeTitles = new Set(shown);
    let rewards: any[] | null = await generateAIBoxes([...excludeTitles]);
    if (!rewards) {
      const pool = REWARD_POOL.filter(r => !excludeTitles.has(r.title));
      rewards = pickN(pool.length >= 3 ? pool : REWARD_POOL, 3);
    }

    const boxes = rewards.map((r: any) => ({
      title: r.title,
      category: r.category,
      original_price_ngn: r.price_ngn,
      original_price: r.price_ngn,
      image_url: r.image,
      description: r.description,
      benefits: r.benefits ?? ['Authentic premium quality', 'Fast nationwide shipping', 'Satisfaction guaranteed', 'Delivered in premium packaging'],
      faq: [
        { q: 'Is this really free?', a: 'Yes — the product is 100% free. You only cover the ₦10,000 shipping fee.' },
        { q: 'When will it ship?', a: 'Orders ship within 24-48 hours after checkout.' },
        { q: 'Can I return it?', a: '30-day hassle-free returns.' },
      ],
      rarity: Math.random() < 0.15 ? 'legendary' : Math.random() < 0.4 ? 'rare' : 'common',
    }));

    const nextCount = isRefresh ? currentCount + 1 : currentCount;
    const nextShown = Array.from(new Set([...shown, ...boxes.map(b => b.title)]));

    await admin.from('reward_mystery_state').upsert({
      user_id: userId,
      refresh_count: nextCount,
      shown_titles: nextShown,
      last_boxes: boxes,
    });

    return new Response(JSON.stringify({
      boxes,
      refreshes_left: Math.max(0, MAX_REFRESHES - nextCount),
      locked: nextCount >= MAX_REFRESHES,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('mystery error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
