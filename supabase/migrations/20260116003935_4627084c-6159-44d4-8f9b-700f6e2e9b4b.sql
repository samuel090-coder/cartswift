-- Add status earnings tracking table
CREATE TABLE IF NOT EXISTS public.status_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID REFERENCES public.user_statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('view', 'reaction')),
  amount DECIMAL(10, 4) NOT NULL,
  from_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_earnings ENABLE ROW LEVEL SECURITY;

-- Users can view their own earnings
CREATE POLICY "Users can view their own status earnings"
ON public.status_earnings
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert earnings
CREATE POLICY "System can insert status earnings"
ON public.status_earnings
FOR INSERT
WITH CHECK (true);

-- Add total_status_earnings column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_status_earnings DECIMAL(10, 4) DEFAULT 0;

-- Allow users to upload music
ALTER TABLE public.status_music_library
ADD COLUMN IF NOT EXISTS uploaded_by UUID,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- RLS for music uploads
CREATE POLICY "Anyone can view approved public music"
ON public.status_music_library
FOR SELECT
USING (is_public = true AND is_approved = true);

CREATE POLICY "Users can upload music"
ON public.status_music_library
FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can manage their own music"
ON public.status_music_library
FOR UPDATE
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own music"
ON public.status_music_library
FOR DELETE
USING (auth.uid() = uploaded_by);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_status_earnings_user_id ON public.status_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_status_earnings_status_id ON public.status_earnings(status_id);
CREATE INDEX IF NOT EXISTS idx_status_music_uploaded_by ON public.status_music_library(uploaded_by);