
-- Add new payment methods to the existing enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'crypto_eth';

-- Create table for payment proofs (bank transfer, crypto, gift cards)
CREATE TABLE public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  proof_type TEXT NOT NULL, -- 'bank_receipt', 'crypto_screenshot', 'gift_card_image', 'gift_card_receipt'
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'under_review'))
);

-- Create table for gift card details
CREATE TABLE public.gift_card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  estimated_value DECIMAL(10,2) NOT NULL,
  card_code TEXT,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for crypto payment details
CREATE TABLE public.crypto_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  crypto_type TEXT DEFAULT 'ETH',
  wallet_address TEXT NOT NULL DEFAULT '0xE0520ED79515cA41a28C1Dc8c09C218C940F7a6e',
  transaction_hash TEXT,
  amount_usd DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for bank transfer details
CREATE TABLE public.bank_transfer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_usd DECIMAL(10,2) NOT NULL,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add phone number to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add payment reference for Paystack
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Enable RLS on new tables
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfer_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment proofs (admin can see all, users can see their own)
CREATE POLICY "Users can view their own payment proofs" ON public.payment_proofs
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE session_id = COALESCE(current_setting('app.session_id', true), ''))
  );

CREATE POLICY "Anyone can insert payment proofs" ON public.payment_proofs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all payment proofs" ON public.payment_proofs
  FOR SELECT USING (true);

CREATE POLICY "Admins can update payment proofs" ON public.payment_proofs
  FOR UPDATE USING (true);

-- Similar policies for other tables
CREATE POLICY "Users can view their own gift card payments" ON public.gift_card_payments
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE session_id = COALESCE(current_setting('app.session_id', true), ''))
  );

CREATE POLICY "Anyone can insert gift card payments" ON public.gift_card_payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own crypto payments" ON public.crypto_payments
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE session_id = COALESCE(current_setting('app.session_id', true), ''))
  );

CREATE POLICY "Anyone can insert crypto payments" ON public.crypto_payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own bank transfer payments" ON public.bank_transfer_payments
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE session_id = COALESCE(current_setting('app.session_id', true), ''))
  );

CREATE POLICY "Anyone can insert bank transfer payments" ON public.bank_transfer_payments
  FOR INSERT WITH CHECK (true);
