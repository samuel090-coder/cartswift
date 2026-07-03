import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const expected = createHmac('sha512', PAYSTACK_SECRET).update(raw).digest('hex');
    if (expected !== signature) {
      console.warn('Invalid Paystack signature');
      return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const evt = JSON.parse(raw);
    if (evt?.event !== 'charge.success') {
      return new Response(JSON.stringify({ ok: true, ignored: evt?.event }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const d = evt.data || {};
    const reference: string = d.reference;
    const amountNgn = Number(d.amount) / 100;
    const meta = d.metadata || {};

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Route by metadata.kind (set at initialize time)
    if (meta.kind === 'bonus' && meta.bundle_id) {
      await admin.from('reward_bonus_bundles').update({
        status: 'paid',
        payment_reference: reference,
        amount_paid: amountNgn,
      }).eq('id', meta.bundle_id);
    } else if (meta.claim_id) {
      await admin.from('reward_claims').update({
        status: 'paid',
        payment_reference: reference,
        amount_paid: amountNgn,
        currency: 'NGN',
      }).eq('id', meta.claim_id);
    } else {
      // Fallback: match by reference
      await admin.from('reward_claims').update({
        status: 'paid',
        amount_paid: amountNgn,
        currency: 'NGN',
      }).eq('payment_reference', reference);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('webhook error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
