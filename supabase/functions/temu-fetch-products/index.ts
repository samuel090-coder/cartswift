import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Temu Open API product fetcher.
 *
 * NOTE: This function calls the Temu Partner Platform API once `TEMU_APP_KEY`,
 * `TEMU_APP_SECRET`, and `TEMU_ACCESS_TOKEN` secrets are configured. Until then
 * it falls back to a `mock` mode that seeds sample products so admins can test
 * the import flow end-to-end.
 *
 * Reference: https://partner.temu.com/documentation
 */

interface TemuProduct {
  product_id: string;
  title: string;
  description?: string;
  price: number;
  original_price?: number;
  currency: string;
  images: string[];
  category?: string;
  rating?: number;
  review_count?: number;
  product_url?: string;
  sales_count?: number;
}

const TEMU_REGION_HOSTS: Record<string, string> = {
  US: 'https://openapi.temu.com',
  EU: 'https://openapi-eu.temu.com',
  Global: 'https://openapi-global.temu.com',
};

async function callTemuApi(params: {
  appKey: string;
  appSecret: string;
  accessToken: string;
  region: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<{ result?: { goods_list?: any[] }; error?: any }> {
  const host = TEMU_REGION_HOSTS[params.region] ?? TEMU_REGION_HOSTS.Global;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Build sorted param string for HMAC-SHA256 signing (Temu signing convention)
  const allParams: Record<string, string> = {
    type: params.type,
    app_key: params.appKey,
    access_token: params.accessToken,
    timestamp,
    data_type: 'JSON',
    ...Object.fromEntries(
      Object.entries(params.payload).map(([k, v]) => [k, JSON.stringify(v)])
    ),
  };

  const sortedKeys = Object.keys(allParams).sort();
  const signSource =
    params.appSecret +
    sortedKeys.map((k) => `${k}${allParams[k]}`).join('') +
    params.appSecret;

  const encoder = new TextEncoder();
  const data = encoder.encode(signSource);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const sign = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const body = { ...allParams, sign };

  const res = await fetch(host, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return await res.json();
}

function mockProducts(query: string, limit: number): TemuProduct[] {
  const cats = ['Fashion', 'Tools', 'Books', 'Vehicles', 'Animals'];
  return Array.from({ length: limit }, (_, i) => ({
    product_id: `MOCK-${Date.now()}-${i}`,
    title: `${query || 'Trending'} Product #${i + 1}`,
    description: `High-quality ${query || 'trending'} item sourced via Temu marketplace integration.`,
    price: parseFloat((Math.random() * 80 + 5).toFixed(2)),
    original_price: parseFloat((Math.random() * 150 + 100).toFixed(2)),
    currency: 'USD',
    images: [`https://picsum.photos/seed/temu${i}${Date.now()}/400/400`],
    category: cats[i % cats.length],
    rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
    review_count: Math.floor(Math.random() * 50000),
    product_url: `https://www.temu.com/mock-product-${i}`,
    sales_count: Math.floor(Math.random() * 100000),
  }));
}

function mapTemuCategory(temuCat?: string): string {
  if (!temuCat) return 'Fashion';
  const c = temuCat.toLowerCase();
  if (c.includes('book')) return 'Books';
  if (c.includes('pet') || c.includes('animal')) return 'Animals';
  if (c.includes('tool') || c.includes('hardware')) return 'Tools';
  if (c.includes('auto') || c.includes('vehicle') || c.includes('car')) return 'Vehicles';
  return 'Fashion';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const { query = '', limit = 20, mode = 'auto' } = await req.json().catch(() => ({}));

    const appKey = Deno.env.get('TEMU_APP_KEY');
    const appSecret = Deno.env.get('TEMU_APP_SECRET');
    const accessToken = Deno.env.get('TEMU_ACCESS_TOKEN');

    // Get region from settings
    const { data: settings } = await supabase
      .from('temu_api_settings')
      .select('region')
      .limit(1)
      .maybeSingle();

    const region = settings?.region || 'Global';

    let products: TemuProduct[] = [];
    let usedMock = false;

    if (mode === 'mock' || !appKey || !appSecret || !accessToken) {
      usedMock = true;
      products = mockProducts(query, limit);
    } else {
      const apiResp = await callTemuApi({
        appKey,
        appSecret,
        accessToken,
        region,
        type: 'temu.product.list.query',
        payload: {
          page: 1,
          page_size: limit,
          keyword: query || undefined,
        },
      });

      if (apiResp.error) {
        console.error('Temu API error:', apiResp.error);
        return new Response(
          JSON.stringify({ success: false, error: apiResp.error }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const goods = apiResp.result?.goods_list ?? [];
      products = goods.map((g: any) => ({
        product_id: String(g.goods_id ?? g.product_id),
        title: g.goods_name ?? g.title ?? 'Untitled',
        description: g.goods_desc ?? g.description,
        price: Number(g.price ?? g.sale_price ?? 0) / 100,
        original_price: g.original_price ? Number(g.original_price) / 100 : undefined,
        currency: g.currency ?? 'USD',
        images: Array.isArray(g.image_list) ? g.image_list : [g.thumb_url].filter(Boolean),
        category: g.cat_name ?? g.category,
        rating: g.review_score ? Number(g.review_score) : undefined,
        review_count: g.review_num ? Number(g.review_num) : undefined,
        product_url: g.goods_url,
        sales_count: g.sales_count ? Number(g.sales_count) : undefined,
      }));
    }

    // Upsert into temu_products
    const rows = products.map((p) => ({
      temu_product_id: p.product_id,
      title: p.title,
      description: p.description,
      price: p.price,
      original_price: p.original_price,
      currency: p.currency,
      discount_percentage:
        p.original_price && p.original_price > p.price
          ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
          : null,
      images: p.images,
      temu_category: p.category,
      mapped_category: mapTemuCategory(p.category),
      rating: p.rating,
      review_count: p.review_count,
      temu_url: p.product_url,
      sales_count: p.sales_count,
      is_active: true,
    }));

    const { error: upsertError, data: upserted } = await supabase
      .from('temu_products')
      .upsert(rows, { onConflict: 'temu_product_id' })
      .select();

    if (upsertError) throw upsertError;

    // Update last_sync_at
    if (settings) {
      await supabase
        .from('temu_api_settings')
        .update({ last_sync_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: upserted?.length ?? 0,
        usedMock,
        region,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('temu-fetch-products error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
