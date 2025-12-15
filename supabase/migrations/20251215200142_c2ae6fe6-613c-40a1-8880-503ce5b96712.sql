-- Create table for payment method configurations
CREATE TABLE public.payment_method_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_method text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  instructions text,
  wallet_address text,
  account_number text,
  account_name text,
  bank_name text,
  routing_number text,
  email_address text,
  additional_info jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_method_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view enabled payment settings
CREATE POLICY "Anyone can view enabled payment settings"
ON public.payment_method_settings
FOR SELECT
USING (is_enabled = true);

-- Admins can manage all payment settings
CREATE POLICY "Admins can manage payment settings"
ON public.payment_method_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM admin_users
  WHERE admin_users.user_id = auth.uid() AND admin_users.is_admin = true
));

-- Insert default payment methods
INSERT INTO public.payment_method_settings (payment_method, display_name, instructions) VALUES
('cryptocurrency', 'Cryptocurrency (ETH)', 'Send payment to the wallet address below'),
('bank_transfer', 'Bank Transfer', 'Transfer to the bank account below'),
('gift_card', 'Gift Card', 'Enter your gift card details'),
('cash_app', 'Cash App', 'Send payment to our Cash App'),
('paypal', 'PayPal', 'Send payment to our PayPal account'),
('credit_card', 'Credit Card', 'Pay securely with your credit card');