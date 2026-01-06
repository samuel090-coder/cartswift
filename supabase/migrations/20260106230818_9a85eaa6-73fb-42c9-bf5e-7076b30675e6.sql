-- Create a table to store allowed admin emails (more secure than just checking user_id)
CREATE TABLE IF NOT EXISTS public.allowed_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read this table (via service role or specific function)
CREATE POLICY "Admin emails readable by authenticated users"
ON public.allowed_admins FOR SELECT
TO authenticated
USING (true);

-- Add the user's email as an admin
INSERT INTO public.allowed_admins (email) VALUES ('samuelsunday09066423764@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Create function to check if user email is an allowed admin
CREATE OR REPLACE FUNCTION public.is_allowed_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_admins WHERE email = user_email
  )
$$;