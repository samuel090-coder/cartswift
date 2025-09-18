-- Create share_settings table for admin-controlled product sharing
CREATE TABLE public.share_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL UNIQUE,
  is_shareable BOOLEAN NOT NULL DEFAULT false,
  share_headline TEXT,
  share_benefits TEXT[], -- Array of benefit bullets
  hero_media_url TEXT, -- Video or image URL
  hero_media_type TEXT DEFAULT 'image', -- 'image' or 'video'
  cta_text TEXT DEFAULT 'Buy Now',
  social_proof_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create share_analytics table for tracking views and conversions
CREATE TABLE public.share_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'view', 'click', 'conversion'
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.share_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_settings
CREATE POLICY "Anyone can view shareable settings" 
ON public.share_settings 
FOR SELECT 
USING (is_shareable = true);

CREATE POLICY "Only admins can manage share settings" 
ON public.share_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- RLS policies for share_analytics
CREATE POLICY "Anyone can insert analytics" 
ON public.share_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admins can view analytics" 
ON public.share_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_share_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_share_settings_updated_at
  BEFORE UPDATE ON public.share_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_share_settings_updated_at();