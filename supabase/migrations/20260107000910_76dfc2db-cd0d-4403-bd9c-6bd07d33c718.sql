
-- Create seller applications table
CREATE TABLE public.seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  
  -- Address Information
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT,
  
  -- Business Information
  store_name TEXT NOT NULL,
  store_description TEXT NOT NULL,
  business_type TEXT NOT NULL, -- individual, registered_business, llc, etc.
  business_registration_number TEXT,
  tax_id TEXT,
  
  -- Product Information
  product_categories TEXT[] NOT NULL,
  estimated_monthly_products INTEGER,
  product_source TEXT, -- manufacturer, wholesale, handmade, dropship
  
  -- Bank/Payment Information
  bank_name TEXT,
  account_holder_name TEXT,
  account_number TEXT,
  routing_number TEXT,
  paypal_email TEXT,
  crypto_wallet TEXT,
  preferred_payout_method TEXT NOT NULL, -- bank_transfer, paypal, crypto
  
  -- Social Media & Website
  website_url TEXT,
  instagram_handle TEXT,
  facebook_url TEXT,
  
  -- Documents
  id_document_url TEXT,
  business_document_url TEXT,
  
  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Agreement
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  agreed_to_commission BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ambassador applications table
CREATE TABLE public.ambassador_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Personal Information (to be auto-filled by AI from ID scan)
  full_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  country TEXT,
  
  -- Social Media Handles
  instagram_handle TEXT,
  twitter_handle TEXT,
  tiktok_handle TEXT,
  youtube_channel TEXT,
  facebook_url TEXT,
  
  -- Follower counts
  total_followers INTEGER,
  instagram_followers INTEGER,
  twitter_followers INTEGER,
  tiktok_followers INTEGER,
  youtube_subscribers INTEGER,
  
  -- Content niche
  content_niche TEXT[], -- fashion, tech, lifestyle, beauty, etc.
  
  -- ID Documents (multiple options)
  id_type TEXT, -- passport, drivers_license, national_id, voters_card
  id_document_url TEXT NOT NULL,
  id_scan_data JSONB, -- AI extracted data from ID
  
  -- Profile photo extracted from ID
  extracted_photo_url TEXT,
  
  -- Why they want to be ambassador
  motivation TEXT,
  promotion_plan TEXT,
  
  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Agreement
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_applications
CREATE POLICY "Users can view their own seller application"
  ON public.seller_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seller application"
  ON public.seller_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending seller application"
  ON public.seller_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all seller applications"
  ON public.seller_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update all seller applications"
  ON public.seller_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for ambassador_applications
CREATE POLICY "Users can view their own ambassador application"
  ON public.ambassador_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ambassador application"
  ON public.ambassador_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending ambassador application"
  ON public.ambassador_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all ambassador applications"
  ON public.ambassador_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update all ambassador applications"
  ON public.ambassador_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true));

-- Create trigger for updated_at
CREATE TRIGGER update_seller_applications_updated_at
  BEFORE UPDATE ON public.seller_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ambassador_applications_updated_at
  BEFORE UPDATE ON public.ambassador_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add seller_approved field to profiles to track if seller was approved via application
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_application_approved BOOLEAN DEFAULT false;
