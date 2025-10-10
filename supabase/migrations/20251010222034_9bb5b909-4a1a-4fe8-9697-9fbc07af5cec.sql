-- Add item_type to distinguish between products and downloadable items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product';
ALTER TABLE public.items ADD CONSTRAINT items_item_type_check CHECK (item_type IN ('product', 'apk', 'file'));

-- Add columns for downloadable items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS allowed_payment_methods text[] DEFAULT ARRAY['stripe', 'paypal', 'crypto', 'bank_transfer', 'gift_card']::text[];

-- Create downloads table to track download access
CREATE TABLE IF NOT EXISTS public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  email text NOT NULL,
  download_token text NOT NULL UNIQUE,
  payment_verified boolean DEFAULT false,
  downloaded_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  session_id text NOT NULL
);

-- Enable RLS on downloads
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- RLS policies for downloads
CREATE POLICY "Admins can view all downloads"
ON public.downloads FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE user_id = auth.uid() AND is_admin = true
));

CREATE POLICY "Users can view their own downloads"
ON public.downloads FOR SELECT
USING (
  session_id = COALESCE(current_setting('app.session_id', true), '') OR
  email = COALESCE(current_setting('app.user_email', true), '')
);

CREATE POLICY "System can insert downloads"
ON public.downloads FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update downloads"
ON public.downloads FOR UPDATE
USING (true);

-- Function to generate unique download token
CREATE OR REPLACE FUNCTION public.generate_download_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token text;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$;

-- Fix the update_item_popularity trigger to handle tables without quantity field
CREATE OR REPLACE FUNCTION public.update_item_popularity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert or update popularity data
  INSERT INTO public.item_popularity (item_id, view_count, share_count, wishlist_count, purchase_count, trending_score, last_updated)
  VALUES (
    COALESCE(NEW.item_id, OLD.item_id),
    CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE((SELECT quantity FROM order_items WHERE id = NEW.id), 0) ELSE 0 END,
    0,
    now()
  )
  ON CONFLICT (item_id) DO UPDATE SET
    view_count = item_popularity.view_count + CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    share_count = item_popularity.share_count + CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END,
    wishlist_count = item_popularity.wishlist_count + CASE 
      WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 
      WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'DELETE' THEN -1 
      ELSE 0 END,
    purchase_count = item_popularity.purchase_count + CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE((SELECT quantity FROM order_items WHERE id = NEW.id), 0) ELSE 0 END,
    trending_score = (
      (item_popularity.view_count + CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END) * 1 +
      (item_popularity.share_count + CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END) * 3 +
      (item_popularity.wishlist_count + CASE 
        WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 
        WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'DELETE' THEN -1 
        ELSE 0 END) * 2 +
      (item_popularity.purchase_count + CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE((SELECT quantity FROM order_items WHERE id = NEW.id), 0) ELSE 0 END) * 5
    ),
    last_updated = now();

  RETURN COALESCE(NEW, OLD);
END;
$function$;