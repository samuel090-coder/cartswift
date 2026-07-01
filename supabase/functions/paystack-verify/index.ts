import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { reference, target, id, delivery, recipient, recipient_type } = await req.json();
    if (!reference || !target || !id) {
      return new Response(JSON.stringify({ error: 'reference, target, id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await res.json();
    if (!data.status || data.data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Payment not successful', data }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const amountUSD = Number(data.data.amount) / 100 / 1600; // kobo -> NGN -> USD approx

    if (target === 'claim') {
      const { error } = await admin.from('reward_claims').update({
        status: 'paid',
        payment_reference: reference,
        amount_paid: amountUSD,
        delivery,
      }).eq('id', id);
      if (error) throw error;
    } else if (target === 'bundle') {
      const { error } = await admin.from('reward_bonus_bundles').update({
        status: 'paid',
        payment_reference: reference,
        amount_paid: amountUSD,
        recipient,
        recipient_type: recipient_type || 'self',
      }).eq('id', id);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, reference }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
