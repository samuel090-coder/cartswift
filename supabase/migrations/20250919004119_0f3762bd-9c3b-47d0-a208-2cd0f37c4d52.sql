-- Create wishlist table
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_name TEXT,
  reviewer_email TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_session_id TEXT NOT NULL,
  referrer_email TEXT,
  referred_email TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC DEFAULT 0,
  order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create loyalty points table
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  email TEXT,
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_spent INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL, -- 'purchase', 'referral', 'social_share', 'review'
  order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flash sales table
CREATE TABLE public.flash_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  original_price NUMERIC NOT NULL,
  sale_price NUMERIC NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_quantity INTEGER,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social shares table
CREATE TABLE public.social_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'facebook', 'twitter', 'instagram', 'whatsapp'
  shared_url TEXT NOT NULL,
  reward_points INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collections table
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_seasonal BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection items table
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL,
  item_id UUID NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trending items table (tracks popularity)
CREATE TABLE public.item_popularity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL UNIQUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  wishlist_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  trending_score NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_popularity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlists
CREATE POLICY "Users can manage their own wishlist" ON public.wishlists
FOR ALL USING (session_id = COALESCE(current_setting('app.session_id', true), ''));

CREATE POLICY "Anyone can view wishlists" ON public.wishlists
FOR SELECT USING (true);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all reviews" ON public.reviews
FOR ALL USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS Policies for referrals
CREATE POLICY "Users can view their referrals" ON public.referrals
FOR SELECT USING (
  referrer_session_id = COALESCE(current_setting('app.session_id', true), '') OR
  referrer_email = COALESCE(current_setting('app.user_email', true), '')
);

CREATE POLICY "Anyone can create referrals" ON public.referrals
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage referrals" ON public.referrals
FOR ALL USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS Policies for loyalty points
CREATE POLICY "Users can view their points" ON public.loyalty_points
FOR SELECT USING (
  session_id = COALESCE(current_setting('app.session_id', true), '') OR
  email = COALESCE(current_setting('app.user_email', true), '')
);

CREATE POLICY "System can insert points" ON public.loyalty_points
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage points" ON public.loyalty_points
FOR ALL USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS Policies for flash sales
CREATE POLICY "Anyone can view active flash sales" ON public.flash_sales
FOR SELECT USING (is_active = true AND starts_at <= now() AND ends_at >= now());

CREATE POLICY "Admins can manage flash sales" ON public.flash_sales
FOR ALL USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS Policies for social shares
CREATE POLICY "Users can view their shares" ON public.social_shares
FOR SELECT USING (session_id = COALESCE(current_setting('app.session_id', true), ''));

CREATE POLICY "Anyone can create shares" ON public.social_shares
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all shares" ON public.social_shares
FOR ALL USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS Policies for collections
CREATE POLICY "Anyone can view collections" ON public.collections
FOR SELECT USING (true);

CREATE POLICY "Admins can manage collections" ON public.collections
FOR ALL USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS Policies for collection items
CREATE POLICY "Anyone can view collection items" ON public.collection_items
FOR SELECT USING (true);

CREATE POLICY "Admins can manage collection items" ON public.collection_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS Policies for item popularity
CREATE POLICY "Anyone can view popularity data" ON public.item_popularity
FOR SELECT USING (true);

CREATE POLICY "System can update popularity" ON public.item_popularity
FOR ALL WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_wishlists_session_id ON public.wishlists(session_id);
CREATE INDEX idx_wishlists_item_id ON public.wishlists(item_id);
CREATE INDEX idx_reviews_item_id ON public.reviews(item_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_loyalty_points_session_id ON public.loyalty_points(session_id);
CREATE INDEX idx_loyalty_points_email ON public.loyalty_points(email);
CREATE INDEX idx_flash_sales_item_id ON public.flash_sales(item_id);
CREATE INDEX idx_flash_sales_active_dates ON public.flash_sales(is_active, starts_at, ends_at);
CREATE INDEX idx_social_shares_item_id ON public.social_shares(item_id);
CREATE INDEX idx_social_shares_session_id ON public.social_shares(session_id);
CREATE INDEX idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX idx_collection_items_item_id ON public.collection_items(item_id);
CREATE INDEX idx_item_popularity_trending_score ON public.item_popularity(trending_score DESC);

-- Create function to update item popularity
CREATE OR REPLACE FUNCTION public.update_item_popularity()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update popularity data
  INSERT INTO public.item_popularity (item_id, view_count, share_count, wishlist_count, purchase_count, trending_score, last_updated)
  VALUES (
    COALESCE(NEW.item_id, OLD.item_id),
    CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE(NEW.quantity, 0) ELSE 0 END,
    0, -- Will be calculated in update
    now()
  )
  ON CONFLICT (item_id) DO UPDATE SET
    view_count = item_popularity.view_count + CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    share_count = item_popularity.share_count + CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END,
    wishlist_count = item_popularity.wishlist_count + CASE 
      WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 
      WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'DELETE' THEN -1 
      ELSE 0 END,
    purchase_count = item_popularity.purchase_count + CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE(NEW.quantity, 0) ELSE 0 END,
    trending_score = (
      (item_popularity.view_count + CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END) * 1 +
      (item_popularity.share_count + CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END) * 3 +
      (item_popularity.wishlist_count + CASE 
        WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 
        WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'DELETE' THEN -1 
        ELSE 0 END) * 2 +
      (item_popularity.purchase_count + CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE(NEW.quantity, 0) ELSE 0 END) * 5
    ),
    last_updated = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for popularity tracking
CREATE TRIGGER update_popularity_on_view
  AFTER INSERT ON public.share_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_popularity();

CREATE TRIGGER update_popularity_on_share
  AFTER INSERT ON public.social_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_popularity();

CREATE TRIGGER update_popularity_on_wishlist_add
  AFTER INSERT ON public.wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_popularity();

CREATE TRIGGER update_popularity_on_wishlist_remove
  AFTER DELETE ON public.wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_popularity();

CREATE TRIGGER update_popularity_on_purchase
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_popularity();