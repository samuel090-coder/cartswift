import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { reference, target, id, delivery, recipient, recipient_type } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: 'reference required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await res.json();
    if (!data.status || data.data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Payment not successful', data }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const amountNgn = Number(data.data.amount) / 100; // kobo -> naira
    const meta = data.data.metadata || {};
    const resolvedTarget = target || meta.kind === 'bonus' ? 'bundle' : 'claim';
    const resolvedId = id || meta.claim_id || meta.bundle_id;

    if (resolvedTarget === 'claim' && resolvedId) {
      const { error } = await admin.from('reward_claims').update({
        status: 'paid',
        payment_reference: reference,
        amount_paid: amountNgn,
        currency: 'NGN',
        ...(delivery ? { delivery } : {}),
      }).eq('id', resolvedId);
      if (error) throw error;
    } else if (resolvedTarget === 'bundle' && resolvedId) {
      const { error } = await admin.from('reward_bonus_bundles').update({
        status: 'paid',
        payment_reference: reference,
        amount_paid: amountNgn,
        ...(recipient ? { recipient } : {}),
        recipient_type: recipient_type || 'self',
      }).eq('id', resolvedId);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, reference, amount: amountNgn }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
