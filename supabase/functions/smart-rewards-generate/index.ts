import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const REWARD_POOL = [
  { title: 'Premium Wireless Earbuds', category: 'Electronics', price: 149, prompt: 'luxurious black wireless earbuds in an open charging case, studio product photography, soft gradient background, cinematic lighting, ultra sharp, 4k' },
  { title: 'Smart Fitness Watch', category: 'Electronics', price: 199, prompt: 'premium modern smartwatch with black silicone band, glowing screen, product shot on gradient dark background, cinematic lighting' },
  { title: 'Luxury Leather Wallet', category: 'Fashion', price: 89, prompt: 'premium brown leather bifold wallet, elegant product photography, soft warm lighting, dark background' },
  { title: 'Designer Sunglasses', category: 'Fashion', price: 119, prompt: 'stylish designer aviator sunglasses, glossy black frame, luxury product shot, gradient dark background' },
  { title: 'Portable Bluetooth Speaker', category: 'Electronics', price: 79, prompt: 'sleek portable bluetooth speaker, matte finish, product photography, dark cinematic background, glowing accents' },
  { title: 'Aromatherapy Diffuser', category: 'Home', price: 69, prompt: 'elegant wooden aromatherapy diffuser with soft steam, warm ambient lighting, luxury home product shot' },
  { title: 'Premium Skincare Set', category: 'Beauty', price: 129, prompt: 'luxury skincare bottles arranged elegantly, soft pastel gradient background, product photography, spa aesthetic' },
  { title: 'Wireless Charging Pad', category: 'Electronics', price: 59, prompt: 'minimalist black wireless charging pad glowing softly, product photography, dark gradient background' },
];

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-image-2',
        prompt,
        size: '1024x1024',
        quality: 'low',
        n: 1,
      }),
    });
    if (!res.ok) {
      console.error('Image gen failed', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch (e) {
    console.error('Image gen error', e);
    return null;
  }
}

async function generateCopy(product: typeof REWARD_POOL[0]): Promise<{ description: string; benefits: string[]; faq: {q:string;a:string}[] }> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You write premium, exciting, honest marketing copy. Return strictly valid JSON.' },
          { role: 'user', content: `Product: ${product.title} (${product.category}). Return JSON: {"description": "2-sentence premium description", "benefits": ["4 short benefit bullets"], "faq":[{"q":"...","a":"..."}, 3 items]}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? '{}';
    return JSON.parse(text);
  } catch (e) {
    console.error('copy gen error', e);
    return { description: `Experience the ${product.title}, a premium ${product.category.toLowerCase()} pick chosen just for you.`, benefits: ['Premium quality', 'Fast worldwide shipping', 'Backed by our guarantee', 'Ships in premium packaging'], faq: [{q:'Is this really free?', a:'Yes — you only cover the shipping fee.'}] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sessionId, interests } = await req.json();
    if (!sessionId) return new Response(JSON.stringify({ error: 'sessionId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Pick a reward — prefer matching interests, else random
    let pool = REWARD_POOL;
    if (Array.isArray(interests) && interests.length) {
      const match = REWARD_POOL.filter(p => interests.includes(p.category));
      if (match.length) pool = match;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];

    const [imageUrl, copy] = await Promise.all([
      generateImage(pick.prompt),
      generateCopy(pick),
    ]);

    const primary_reward = {
      title: pick.title,
      category: pick.category,
      original_price: pick.price,
      image_url: imageUrl,
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
