const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!PAYSTACK_SECRET) throw new Error('PAYSTACK_SECRET_KEY not configured');
    const { email, amount, currency, reference, metadata, callback_url } = await req.json();
    if (!email || !amount) {
      return new Response(JSON.stringify({ error: 'email and amount required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Amounts arrive in NGN (whole naira). Convert to kobo.
    const useCurrency = (currency || 'NGN').toUpperCase();
    const amountKobo = Math.round(Number(amount) * 100);

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
    if (!data.status) {
      console.error('Paystack init failed', data);
      return new Response(JSON.stringify({ error: data.message || 'Paystack init failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data.data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
