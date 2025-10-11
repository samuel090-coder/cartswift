-- Add currency field to items table
ALTER TABLE items ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- Add a comment to clarify supported currencies
COMMENT ON COLUMN items.currency IS 'Currency code (USD, NGN, EUR, GBP, etc.)';