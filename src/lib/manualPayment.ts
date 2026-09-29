import { supabase } from '@/integrations/supabase/client';
import { Building2, Coins, Gift } from 'lucide-react';

export interface ManualPaymentMethodOption {
  id: 'bank_transfer' | 'crypto_eth' | 'gift_card';
  label: string;
  description: string;
  icon: any;
}

export const MANUAL_PAYMENT_METHODS: ManualPaymentMethodOption[] = [
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Transfer to our bank account and upload your receipt.',
    icon: Building2,
  },
  {
    id: 'crypto_eth',
    label: 'Cryptocurrency (ETH)',
    description: 'Send ETH to our wallet and upload your payment screenshot.',
    icon: Coins,
  },
  {
    id: 'gift_card',
    label: 'Gift Card',
    description: 'Pay with a supported gift card of equal or higher value.',
    icon: Gift,
  },
];

export const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    USD: '$', NGN: '₦', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹', AUD: 'A$', CAD: 'C$',
  };
  return symbols[currency] || currency;
};

/** Upload a proof-of-payment file to the payment-proofs bucket and return its public URL. */
export async function uploadPaymentProof(file: File, type: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
}

/** Record an uploaded proof so admins can review and approve it. */
export async function recordPaymentProof(opts: {
  orderId?: string | null;
  paymentMethod: string;
  proofType: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
}) {
  const { error } = await supabase.from('payment_proofs').insert({
    order_id: opts.orderId || null,
    payment_method: opts.paymentMethod as any,
    proof_type: opts.proofType,
    file_url: opts.fileUrl,
    file_name: opts.fileName || null,
    file_size: opts.fileSize || null,
    status: 'pending',
  });
  if (error) console.warn('Failed to record payment proof:', error);
}
