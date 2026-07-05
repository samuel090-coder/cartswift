const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  try {
    console.log('[paystack-initialize] start', {
      requestId,
      method: req.method,
      hasAuthorization: Boolean(req.headers.get('authorization')),
      hasApikey: Boolean(req.headers.get('apikey')),
      env: {
        hasPaystackSecret: Boolean(PAYSTACK_SECRET),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      },
    });

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[paystack-initialize] missing env', {
        requestId,
        hasPaystackSecret: Boolean(PAYSTACK_SECRET),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      });
      return json({ error: 'Server payment configuration is incomplete', request_id: requestId }, 500);
    }

    const { email, amount, currency, reference, metadata, callback_url } = await req.json();
    const numericAmount = Number(amount);

    console.log('[paystack-initialize] payload', {
      requestId,
      email,
      amount: numericAmount,
      currency,
      reference,
      callback_url,
      metadata_kind: metadata?.kind,
      metadata_keys: metadata ? Object.keys(metadata) : [],
    });

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return json({ error: 'A valid customer email is required', request_id: requestId }, 400);
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return json({ error: 'A valid amount is required', request_id: requestId }, 400);
    }

    // Amounts arrive in NGN (whole naira). Convert to kobo.
    const useCurrency = (currency || 'NGN').toUpperCase();
    const amountKobo = Math.round(numericAmount * 100);
    if (amountKobo < 100) {
      return json({ error: 'Amount is too low for Paystack', request_id: requestId }, 400);
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency: useCurrency,
        reference,
        metadata,
        callback_url,
      }),
    });
    const data = await res.json();
    console.log('[paystack-initialize] paystack response', {
      requestId,
      httpStatus: res.status,
      paystackStatus: data?.status,
      paystackMessage: data?.message,
      hasAuthorizationUrl: Boolean(data?.data?.authorization_url),
      reference: data?.data?.reference || reference,
    });

    if (!data.status) {
      console.error('[paystack-initialize] Paystack init failed', { requestId, status: res.status, message: data?.message });
      return json({ error: data.message || 'Paystack init failed', request_id: requestId }, 400);
    }
    return json({ ...data.data, request_id: requestId });
  } catch (e) {
    console.error('[paystack-initialize] exception', { requestId, error: String(e) });
    return json({ error: String(e), request_id: requestId }, 500);
  }
});
