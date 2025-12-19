-- Add currency column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add admin_download_link to items for admin-managed download URLs
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS admin_download_link TEXT;

-- Update existing orders to get currency from their items
-- (This is a one-time migration to set existing orders' currency)