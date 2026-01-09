-- Create boost_requests table for product boosting
CREATE TABLE public.boost_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  target_views INTEGER NOT NULL DEFAULT 1000,
  target_locations TEXT[] DEFAULT '{}',
  expected_buyers INTEGER DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 7,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
  actual_views INTEGER DEFAULT 0,
  admin_rating NUMERIC(2,1),
  admin_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add profile background image column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_image_url TEXT;

-- Enable RLS on boost_requests
ALTER TABLE public.boost_requests ENABLE ROW LEVEL SECURITY;

-- Policies for boost_requests
CREATE POLICY "Sellers can view their own boost requests"
  ON public.boost_requests FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create boost requests"
  ON public.boost_requests FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Admins can view all boost requests"
  ON public.boost_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can update boost requests"
  ON public.boost_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true
  ));

-- Create index for faster queries
CREATE INDEX idx_boost_requests_seller_id ON public.boost_requests(seller_id);
CREATE INDEX idx_boost_requests_product_id ON public.boost_requests(product_id);
CREATE INDEX idx_boost_requests_status ON public.boost_requests(status);

-- Trigger for updated_at
CREATE TRIGGER update_boost_requests_updated_at
  BEFORE UPDATE ON public.boost_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();