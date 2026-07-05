import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    console.log('[paystack-verify] start', {
      requestId,
      hasAuthorization: Boolean(req.headers.get('authorization')),
      env: {
        hasPaystackSecret: Boolean(PAYSTACK_SECRET),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRole: Boolean(SERVICE_ROLE),
      },
    });
    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: 'Server payment configuration is incomplete', request_id: requestId }, 500);
    }

    const { reference, target, id, delivery, recipient, recipient_type } = await req.json();
    if (!reference) {
      return json({ error: 'reference required', request_id: requestId }, 400);
    }

    console.log('[paystack-verify] payload', { requestId, reference, target, id });

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await res.json();

    console.log('[paystack-verify] paystack response', {
      requestId,
      httpStatus: res.status,
      paystackStatus: data?.status,
      transactionStatus: data?.data?.status,
      amount: data?.data?.amount,
      reference: data?.data?.reference,
    });

    if (!data.status || data.data?.status !== 'success') {
      return json({ error: 'Payment not successful', request_id: requestId }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const amountNgn = Number(data.data.amount) / 100; // kobo -> naira
    const meta = data.data.metadata || {};
    const resolvedTarget = target || (meta.kind === 'bonus' ? 'bundle' : meta.kind || 'claim');
    const resolvedId = id || meta.claim_id || meta.bundle_id || meta.order_id || meta.deposit_id || meta.boost_id;

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
    } else if ((resolvedTarget === 'order' || meta.kind === 'order' || meta.kind === 'download' || meta.kind === 'status_purchase') && (meta.order_id || resolvedId)) {
      const orderId = meta.order_id || resolvedId;
      const { error } = await admin.from('orders').update({
        status: 'processing',
        payment_method: 'credit_card',
        payment_reference: reference,
      }).eq('id', orderId);
      if (error) throw error;

      if (meta.download_id) {
        const { error: downloadError } = await admin.from('downloads').update({ payment_verified: true }).eq('id', meta.download_id);
        if (downloadError) throw downloadError;
      }

      if (meta.status_purchase_id) {
        const { error: statusError } = await admin.from('status_purchases').update({ status: 'paid', completed_at: new Date().toISOString() }).eq('id', meta.status_purchase_id);
        if (statusError) throw statusError;
      }
    } else if ((resolvedTarget === 'deposit' || meta.kind === 'deposit') && (meta.deposit_id || resolvedId)) {
      const depositId = meta.deposit_id || resolvedId;
      const { data: deposit, error: depositReadError } = await admin.from('deposit_requests').select('id,user_id,amount,status').eq('id', depositId).maybeSingle();
      if (depositReadError) throw depositReadError;
      if (deposit) {
        const { error: depError } = await admin.from('deposit_requests').update({ status: 'approved', payment_reference: reference, reviewed_at: new Date().toISOString() }).eq('id', depositId);
        if (depError) throw depError;
        const { data: wallet } = await admin.from('wallets').select('id,balance').eq('user_id', deposit.user_id).maybeSingle();
        if (wallet && deposit.status !== 'approved') {
          await admin.from('wallets').update({ balance: Number(wallet.balance || 0) + Number(deposit.amount || 0) }).eq('id', wallet.id);
        }
      }
    } else if ((resolvedTarget === 'boost' || meta.kind === 'boost') && (meta.boost_id || resolvedId)) {
      const boostId = meta.boost_id || resolvedId;
      const { error } = await admin.from('boost_requests').update({ payment_reference: reference, status: 'pending' }).eq('id', boostId);
      if (error) throw error;
    }

    console.log('[paystack-verify] updated', { requestId, resolvedTarget, resolvedId, reference });
    return json({ ok: true, reference, amount: amountNgn, request_id: requestId });
  } catch (e) {
    console.error('[paystack-verify] exception', { requestId, error: String(e) });
    return json({ error: String(e), request_id: requestId }, 500);
  }
});
