-- Create deposit payment methods table for admin to manage
CREATE TABLE public.deposit_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_name TEXT NOT NULL,
  method_type TEXT NOT NULL, -- bank_transfer, crypto, paypal, etc.
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  wallet_address TEXT,
  email_address TEXT,
  additional_info JSONB,
  instructions TEXT,
  is_enabled BOOLEAN DEFAULT true,
  supported_currencies TEXT[] DEFAULT ARRAY['USD'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposit_payment_methods ENABLE ROW LEVEL SECURITY;

-- Public can read enabled payment methods
CREATE POLICY "Anyone can view enabled deposit payment methods"
  ON public.deposit_payment_methods
  FOR SELECT
  USING (is_enabled = true);

-- Update deposit_requests to add currency column
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Create trigger for updated_at
CREATE TRIGGER update_deposit_payment_methods_updated_at
  BEFORE UPDATE ON public.deposit_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();