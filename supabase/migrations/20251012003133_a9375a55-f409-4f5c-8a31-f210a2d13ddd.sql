-- Add currency columns to payment tables
ALTER TABLE public.bank_transfer_payments 
ADD COLUMN currency text DEFAULT 'USD';

ALTER TABLE public.crypto_payments 
ADD COLUMN currency text DEFAULT 'USD';

ALTER TABLE public.gift_card_payments 
ADD COLUMN currency text DEFAULT 'USD';

-- Update column comments to reflect they store amounts in their respective currency
COMMENT ON COLUMN public.bank_transfer_payments.amount_usd IS 'Amount in the currency specified by the currency column';
COMMENT ON COLUMN public.crypto_payments.amount_usd IS 'Amount in the currency specified by the currency column';
COMMENT ON COLUMN public.gift_card_payments.estimated_value IS 'Amount in the currency specified by the currency column';