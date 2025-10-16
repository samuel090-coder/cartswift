-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-files', 'media-files', true);

-- Create table for media file metadata
CREATE TABLE public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- audio, video, image
  file_purpose TEXT NOT NULL, -- welcome_voice, promotional, etc.
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view media files"
  ON public.media_files
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage media files"
  ON public.media_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Storage policies for media-files bucket
CREATE POLICY "Anyone can view media files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media-files');

CREATE POLICY "Admins can upload media files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-files' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update media files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'media-files' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete media files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media-files' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );