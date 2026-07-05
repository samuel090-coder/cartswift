import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qcfsnqumydfminvmqyfp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InFjZnNucXVteWRmbWludm1xeWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzcwMDIsImV4cCI6MjA2NjcxMzAwMn0.u9yL-M4ePbFxrkifl5GQlExtib5FCU3-84BiBYxCDCE';

const NGN_RATES: Record<string, number> = {
  NGN: 1,
  USD: 1500,
  EUR: 1650,
  GBP: 1900,
  CAD: 1100,
  AUD: 1000,
  GHS: 105,
  KES: 12,
  ZAR: 82,
  INR: 18,
  CNY: 210,
  JPY: 10,
};

export const getPaystackAmountNgn = (amount: number, currency = 'NGN') => {
  const normalized = (currency || 'NGN').toUpperCase();
  const rate = NGN_RATES[normalized] || NGN_RATES.USD;
  return Math.max(100, Math.round(Number(amount || 0) * rate));
};

export const formatNaira = (amount: number) => `₦${Math.round(Number(amount || 0)).toLocaleString('en-NG')}`;

export const makePaymentReference = (prefix: string, id?: string) => {
  const shortId = id ? id.replace(/-/g, '').slice(0, 10) : crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `${prefix}_${shortId}_${Date.now()}`;
};

const safePayloadForLog = (payload: Record<string, any>) => ({
  email: payload.email,
  amount: payload.amount,
  currency: payload.currency,
  reference: payload.reference,
  callback_url: payload.callback_url,
  metadata: payload.metadata,
});

export async function callEdgeFunction<T = any>(functionName: string, payload: Record<string, any>): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  console.info('[CartSwift Edge] request', {
    functionName,
    url,
    hasUserToken: Boolean(accessToken),
    payload: safePayloadForLog(payload),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      'x-client-info': 'cartswift-web',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { error: text || 'Non-JSON response from Edge Function' };
  }

  console.info('[CartSwift Edge] response', {
    functionName,
    status: response.status,
    ok: response.ok,
    requestId: parsed?.request_id,
    hasAuthorizationUrl: Boolean(parsed?.authorization_url),
    error: parsed?.error || parsed?.message,
  });

  if (!response.ok) {
    throw new Error(parsed?.error || parsed?.message || `Edge Function failed with HTTP ${response.status}`);
  }

  return parsed as T;
}

export async function initializePaystackPayment(payload: {
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  callback_url: string;
  metadata?: Record<string, any>;
}) {
  return callEdgeFunction<{
    authorization_url: string;
    access_code: string;
    reference: string;
    request_id?: string;
  }>('paystack-initialize', {
    ...payload,
    currency: (payload.currency || 'NGN').toUpperCase(),
  });
}

export async function verifyPaystackPayment(payload: {
  reference: string;
  target?: string;
  id?: string | null;
  delivery?: Record<string, any>;
  recipient?: Record<string, any>;
  recipient_type?: string;
}) {
  return callEdgeFunction('paystack-verify', payload);
}