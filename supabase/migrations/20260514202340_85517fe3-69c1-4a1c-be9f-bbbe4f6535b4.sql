-- Create temu_products table for caching fetched Temu products
CREATE TABLE public.temu_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temu_product_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    original_price NUMERIC,
    discount_percentage NUMERIC,
    images TEXT[],
    temu_category TEXT,
    mapped_category public.item_category,
    rating NUMERIC,
    review_count INTEGER,
    temu_url TEXT,
    sales_count INTEGER,
    imported_to_items BOOLEAN DEFAULT false,
    items_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.temu_products ENABLE ROW LEVEL SECURITY;

-- RLS policies: admins can manage, anyone can view active products
CREATE POLICY "Anyone can view active temu products"
ON public.temu_products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage temu products"
ON public.temu_products
FOR ALL
TO authenticated
USING (public.is_allowed_admin((SELECT email FROM public.profiles WHERE id = auth.uid())))
WITH CHECK (public.is_allowed_admin((SELECT email FROM public.profiles WHERE id = auth.uid())));

-- Create trigger for updated_at
CREATE TRIGGER update_temu_products_updated_at
BEFORE UPDATE ON public.temu_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create temu_api_settings table for admin-controlled settings
CREATE TABLE public.temu_api_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_key TEXT,
    access_token TEXT,
    region TEXT DEFAULT 'US',
    sync_enabled BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.temu_api_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access settings
CREATE POLICY "Admins can manage temu api settings"
ON public.temu_api_settings
FOR ALL
TO authenticated
USING (public.is_allowed_admin((SELECT email FROM public.profiles WHERE id = auth.uid())))
WITH CHECK (public.is_allowed_admin((SELECT email FROM public.profiles WHERE id = auth.uid())));

CREATE TRIGGER update_temu_api_settings_updated_at
BEFORE UPDATE ON public.temu_api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_temu_products_active ON public.temu_products(is_active);
CREATE INDEX idx_temu_products_imported ON public.temu_products(imported_to_items);
CREATE INDEX idx_temu_products_category ON public.temu_products(temu_category);