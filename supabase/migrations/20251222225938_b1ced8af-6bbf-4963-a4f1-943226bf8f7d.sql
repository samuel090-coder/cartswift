-- Create marketing emails table to prevent duplicates across generations
CREATE TABLE public.marketing_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  country text NOT NULL DEFAULT 'global',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure global uniqueness of emails
ALTER TABLE public.marketing_emails
  ADD CONSTRAINT marketing_emails_email_key UNIQUE (email);

-- Index for country filtering
CREATE INDEX idx_marketing_emails_country_created_at
  ON public.marketing_emails (country, created_at DESC);

-- Enable RLS
ALTER TABLE public.marketing_emails ENABLE ROW LEVEL SECURITY;

-- Admin-only access (uses existing is_admin_user(uuid) function)
CREATE POLICY "Admins can read marketing emails"
ON public.marketing_emails
FOR SELECT
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can create marketing emails"
ON public.marketing_emails
FOR INSERT
WITH CHECK (public.is_admin_user(auth.uid()));
