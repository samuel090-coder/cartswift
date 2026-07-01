import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;

// USD -> NGN fallback (Paystack requires NGN for most accounts).
// If your Paystack account supports USD, set currency to 'USD' below.
const USD_TO_NGN = 1600;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, amount, currency, reference, metadata, callback_url } = await req.json();
    if (!email || !amount) {
      return new Response(JSON.stringify({ error: 'email and amount required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Convert USD -> NGN kobo
    const useCurrency = 'NGN';
    const amountKobo = Math.round(Number(amount) * USD_TO_NGN * 100);

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
      return new Response(JSON.stringify({ error: data.message || 'Paystack init failed', data }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(data.data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
