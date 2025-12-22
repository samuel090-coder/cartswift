-- Create visitors table to track site visitors with cookies
CREATE TABLE public.site_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL UNIQUE,
  first_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  visit_count INTEGER NOT NULL DEFAULT 1,
  device_type TEXT,
  browser TEXT,
  operating_system TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  user_agent TEXT,
  screen_resolution TEXT,
  language TEXT,
  cookie_consent_given BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMP WITH TIME ZONE
);

-- Create index for visitor_id lookups
CREATE INDEX idx_site_visitors_visitor_id ON public.site_visitors(visitor_id);
CREATE INDEX idx_site_visitors_last_visit ON public.site_visitors(last_visit DESC);

-- Enable RLS
ALTER TABLE public.site_visitors ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visitor data (for tracking)
CREATE POLICY "Anyone can insert visitor data" ON public.site_visitors
  FOR INSERT WITH CHECK (true);

-- Anyone can update their own visitor data
CREATE POLICY "Anyone can update visitor data" ON public.site_visitors
  FOR UPDATE USING (true);

-- Only admins can view all visitor data
CREATE POLICY "Admins can view all visitors" ON public.site_visitors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.is_admin = true)
  );

-- Create storage bucket for media-files if not exists (for AI images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-files', 'media-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;