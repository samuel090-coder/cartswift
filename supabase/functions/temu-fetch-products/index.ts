import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Third-party marketplace product fetcher.
 *
 * Calls the "Original Dropshipping Product Finder" API hosted on RapidAPI
 * to populate the marketplace catalog with externally-sourced products.
 * Requires `RAPIDAPI_KEY` secret. Falls back to mock data if missing or if
 * the upstream API returns an error.
 */

interface NormalizedProduct {
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

const RAPIDAPI_HOST = 'original-dropshipping-product-finder.p.rapidapi.com';
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}/findproduct/`;

function pickFirst<T>(...vals: (T | null | undefined)[]): T | undefined {
  for (const v of vals) if (v !== null && v !== undefined && v !== '') return v as T;
  return undefined;
}

function normalize(raw: any, idx: number): NormalizedProduct | null {
  if (!raw || typeof raw !== 'object') return null;

  const title = pickFirst<string>(
    raw.title, raw.name, raw.product_name, raw.productTitle, raw.goods_name
  );
  if (!title) return null;

  const priceRaw = pickFirst<any>(
    raw.price, raw.sale_price, raw.salePrice, raw.current_price, raw.amount
  );
  const price = typeof priceRaw === 'number'
    ? priceRaw
    : parseFloat(String(priceRaw ?? '0').replace(/[^0-9.]/g, '')) || 0;

  const origRaw = pickFirst<any>(raw.original_price, raw.originalPrice, raw.list_price, raw.was_price);
  const original_price = origRaw != null
    ? (typeof origRaw === 'number' ? origRaw : parseFloat(String(origRaw).replace(/[^0-9.]/g, '')) || undefined)
    : undefined;

  let images: string[] = [];
  const imgField = pickFirst<any>(raw.images, raw.image, raw.thumbnail, raw.picture, raw.imageUrl, raw.image_url);
  if (Array.isArray(imgField)) images = imgField.map((i: any) => typeof i === 'string' ? i : i?.url).filter(Boolean);
  else if (typeof imgField === 'string') images = [imgField];

  return {
    product_id: String(pickFirst(raw.id, raw.product_id, raw.productId, raw.sku, raw.asin) ?? `EXT-${Date.now()}-${idx}`),
    title: String(title),
    description: pickFirst<string>(raw.description, raw.desc, raw.summary, raw.detail),
    price,
    original_price,
    currency: String(pickFirst<string>(raw.currency, raw.currency_code) ?? 'USD'),
    images: images.length ? images : [`https://picsum.photos/seed/dropship${idx}/400/400`],
    category: pickFirst<string>(raw.category, raw.cat_name, raw.categoryName),
    rating: raw.rating != null ? Number(raw.rating) : undefined,
    review_count: raw.reviews != null ? Number(raw.reviews) : (raw.review_count != null ? Number(raw.review_count) : undefined),
    product_url: pickFirst<string>(raw.url, raw.product_url, raw.productUrl, raw.link),
    sales_count: raw.sales != null ? Number(raw.sales) : (raw.sales_count != null ? Number(raw.sales_count) : undefined),
  };
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  return (
    payload.products ?? payload.data ?? payload.results ?? payload.items ??
    payload.list ?? payload.response ?? payload.result?.products ?? payload.result ?? []
  );
}

function mockProducts(query: string, limit: number): NormalizedProduct[] {
  const cats = ['Fashion', 'Tools', 'Books', 'Vehicles', 'Animals'];
  return Array.from({ length: limit }, (_, i) => ({
    product_id: `MOCK-${Date.now()}-${i}`,
    title: `${query || 'Trending'} Product #${i + 1}`,
    description: `Quality ${query || 'trending'} item sourced from global dropshipping marketplace.`,
    price: parseFloat((Math.random() * 80 + 5).toFixed(2)),
    original_price: parseFloat((Math.random() * 150 + 100).toFixed(2)),
    currency: 'USD',
    images: [`https://picsum.photos/seed/ds${i}${Date.now()}/400/400`],
    category: cats[i % cats.length],
    rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
    review_count: Math.floor(Math.random() * 50000),
    product_url: `https://example.com/mock-${i}`,
    sales_count: Math.floor(Math.random() * 100000),
  }));
}

function mapCategory(cat?: string): string {
  if (!cat) return 'Fashion';
  const c = cat.toLowerCase();
  if (c.includes('book')) return 'Books';
  if (c.includes('pet') || c.includes('animal')) return 'Animals';
  if (c.includes('tool') || c.includes('hardware') || c.includes('home')) return 'Tools';
  if (c.includes('auto') || c.includes('vehicle') || c.includes('car')) return 'Vehicles';
  return 'Fashion';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const { query = '', limit = 20, mode = 'auto' } = await req.json().catch(() => ({}));
    const rapidKey = Deno.env.get('RAPIDAPI_KEY');

    let products: NormalizedProduct[] = [];
    let usedMock = false;
    let upstreamError: string | null = null;

    if (mode === 'mock' || !rapidKey) {
      usedMock = true;
      products = mockProducts(query, limit);
    } else {
      try {
        // Build URL with optional query params (covers common variants)
        const url = new URL(RAPIDAPI_URL);
        if (query) {
          url.searchParams.set('query', query);
          url.searchParams.set('keyword', query);
          url.searchParams.set('search', query);
        }
        url.searchParams.set('limit', String(limit));

        const upstream = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': RAPIDAPI_HOST,
            'x-rapidapi-key': rapidKey,
          },
        });

        const text = await upstream.text();
        let payload: any = null;
        try { payload = JSON.parse(text); } catch { payload = text; }

        if (!upstream.ok) {
          upstreamError = `Upstream ${upstream.status}: ${typeof payload === 'string' ? payload.slice(0, 200) : JSON.stringify(payload).slice(0, 200)}`;
          console.error('RapidAPI error:', upstreamError);
          usedMock = true;
          products = mockProducts(query, limit);
        } else {
          const list = extractList(payload);
          products = list
            .map((r: any, i: number) => normalize(r, i))
            .filter((p): p is NormalizedProduct => p !== null)
            .slice(0, limit);

          if (products.length === 0) {
            usedMock = true;
            upstreamError = 'Upstream returned no products in a recognised shape';
            products = mockProducts(query, limit);
          }
        }
      } catch (e) {
        console.error('Fetch failed:', e);
        upstreamError = String(e);
        usedMock = true;
        products = mockProducts(query, limit);
      }
    }

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
      mapped_category: mapCategory(p.category),
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

    await supabase
      .from('temu_api_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return new Response(
      JSON.stringify({
        success: true,
        count: upserted?.length ?? 0,
        usedMock,
        upstreamError,
        source: usedMock ? 'mock' : 'rapidapi',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('marketplace-fetch error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
