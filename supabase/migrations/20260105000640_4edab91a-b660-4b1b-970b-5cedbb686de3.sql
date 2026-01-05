
-- =====================================================
-- COMPREHENSIVE FEATURE MIGRATION
-- Seller Marketplace, Subscriptions, Affiliate, etc.
-- =====================================================

-- 1. SELLER PRODUCTS TABLE (sellers list their own products)
CREATE TABLE public.seller_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  category public.item_category NOT NULL,
  images TEXT[],
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP WITH TIME ZONE,
  commission_rate NUMERIC DEFAULT 0.12, -- 12% default commission
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved seller products"
  ON public.seller_products FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Sellers can view their own products"
  ON public.seller_products FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create their own products"
  ON public.seller_products FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products"
  ON public.seller_products FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products"
  ON public.seller_products FOR DELETE
  USING (auth.uid() = seller_id);

-- 2. SELLER ORDERS TABLE (orders for seller products)
CREATE TABLE public.seller_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_product_id UUID NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  buyer_session_id TEXT NOT NULL,
  buyer_email TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  seller_earnings NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their orders"
  ON public.seller_orders FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can create orders"
  ON public.seller_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sellers can update their orders"
  ON public.seller_orders FOR UPDATE
  USING (auth.uid() = seller_id);

-- 3. PREMIUM SUBSCRIPTIONS TABLE
CREATE TYPE public.subscription_tier AS ENUM ('free', 'vip', 'premium');

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  benefits JSONB DEFAULT '{"free_shipping": false, "early_access": false, "bonus_points_multiplier": 1, "exclusive_deals": false}'::jsonb,
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their subscription"
  ON public.subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- 4. FEATURED LISTINGS PAYMENTS
CREATE TABLE public.featured_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 7,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their featured payments"
  ON public.featured_payments FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create featured payments"
  ON public.featured_payments FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- 5. AFFILIATE PROGRAM
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC DEFAULT 0.05, -- 5% default
  total_earnings NUMERIC DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  payout_method TEXT,
  payout_details JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their affiliate data"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their affiliate account"
  ON public.affiliates FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE public.affiliate_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  order_amount NUMERIC NOT NULL,
  commission_earned NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their conversions"
  ON public.affiliate_conversions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.affiliates WHERE affiliates.id = affiliate_conversions.affiliate_id AND affiliates.user_id = auth.uid()
  ));

-- 6. PRICE DROP ALERTS
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  target_price NUMERIC,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create price alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own price alerts"
  ON public.price_alerts FOR SELECT
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' OR auth.uid() = user_id);

CREATE POLICY "Users can delete their alerts"
  ON public.price_alerts FOR DELETE
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' OR auth.uid() = user_id);

-- 7. BROWSING HISTORY (for recommendations)
CREATE TABLE public.browsing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.browsing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert browsing history"
  ON public.browsing_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their history"
  ON public.browsing_history FOR SELECT
  USING (true);

-- 8. LIVE CHAT SUPPORT
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'open',
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (true);

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- 'user', 'support', 'ai'
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

-- 9. ORDER TRACKING UPDATES
CREATE TABLE public.order_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view order tracking"
  ON public.order_tracking FOR SELECT
  USING (true);

-- 10. USER LANGUAGE & CURRENCY PREFERENCES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';

-- 11. AMBASSADOR PROGRAM
CREATE TABLE public.ambassadors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_handles JSONB, -- {"instagram": "@handle", "tiktok": "@handle", etc}
  follower_count INTEGER,
  ambassador_code TEXT NOT NULL UNIQUE,
  discount_percentage NUMERIC DEFAULT 10,
  commission_rate NUMERIC DEFAULT 0.10, -- 10% for ambassadors
  total_sales NUMERIC DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their ambassador data"
  ON public.ambassadors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their ambassador account"
  ON public.ambassadors FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view approved ambassadors"
  ON public.ambassadors FOR SELECT
  USING (is_approved = true);

-- Create indexes for performance
CREATE INDEX idx_seller_products_seller ON public.seller_products(seller_id);
CREATE INDEX idx_seller_products_category ON public.seller_products(category);
CREATE INDEX idx_seller_products_featured ON public.seller_products(is_featured, featured_until);
CREATE INDEX idx_browsing_history_session ON public.browsing_history(session_id);
CREATE INDEX idx_browsing_history_item ON public.browsing_history(item_id);
CREATE INDEX idx_price_alerts_item ON public.price_alerts(item_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX idx_ambassadors_code ON public.ambassadors(ambassador_code);

-- Update function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_seller_products_updated_at
  BEFORE UPDATE ON public.seller_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_orders_updated_at
  BEFORE UPDATE ON public.seller_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
