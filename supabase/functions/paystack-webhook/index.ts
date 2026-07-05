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

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  try {
    console.log('[paystack-webhook] start', {
      requestId,
      hasSignature: Boolean(req.headers.get('x-paystack-signature')),
      env: {
        hasPaystackSecret: Boolean(PAYSTACK_SECRET),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRole: Boolean(SERVICE_ROLE),
      },
    });

    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: 'Server payment configuration is incomplete', request_id: requestId }, 500);
    }

    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const expected = createHmac('sha512', PAYSTACK_SECRET).update(raw).digest('hex');
    if (expected !== signature) {
      console.warn('[paystack-webhook] invalid signature', { requestId });
      return json({ error: 'invalid signature', request_id: requestId }, 401);
    }

    const evt = JSON.parse(raw);
    console.log('[paystack-webhook] event', { requestId, event: evt?.event, reference: evt?.data?.reference, kind: evt?.data?.metadata?.kind });
    if (evt?.event !== 'charge.success') {
      return json({ ok: true, ignored: evt?.event, request_id: requestId });
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
    } else if ((meta.kind === 'order' || meta.kind === 'download' || meta.kind === 'status_purchase') && meta.order_id) {
      await admin.from('orders').update({
        status: 'processing',
        payment_method: 'credit_card',
        payment_reference: reference,
      }).eq('id', meta.order_id);

      if (meta.download_id) {
        await admin.from('downloads').update({ payment_verified: true }).eq('id', meta.download_id);
      }

      if (meta.status_purchase_id) {
        await admin.from('status_purchases').update({ status: 'paid', completed_at: new Date().toISOString() }).eq('id', meta.status_purchase_id);
      }
    } else if (meta.kind === 'deposit' && meta.deposit_id) {
      const { data: deposit } = await admin.from('deposit_requests').select('id,user_id,amount,status').eq('id', meta.deposit_id).maybeSingle();
      if (deposit) {
        await admin.from('deposit_requests').update({ status: 'approved', payment_reference: reference, reviewed_at: new Date().toISOString() }).eq('id', meta.deposit_id);
        const { data: wallet } = await admin.from('wallets').select('id,balance').eq('user_id', deposit.user_id).maybeSingle();
        if (wallet && deposit.status !== 'approved') {
          await admin.from('wallets').update({ balance: Number(wallet.balance || 0) + Number(deposit.amount || 0) }).eq('id', wallet.id);
        }
      }
    } else if (meta.kind === 'boost' && meta.boost_id) {
      await admin.from('boost_requests').update({ status: 'pending', payment_reference: reference }).eq('id', meta.boost_id);
    } else {
      // Fallback: match by reference
      await admin.from('reward_claims').update({
        status: 'paid',
        amount_paid: amountNgn,
        currency: 'NGN',
      }).eq('payment_reference', reference);
    }

    console.log('[paystack-webhook] complete', { requestId, reference, kind: meta.kind });
    return json({ ok: true, request_id: requestId });
  } catch (e) {
    console.error('[paystack-webhook] exception', { requestId, error: String(e) });
    return json({ error: String(e), request_id: requestId }, 500);
  }
});
