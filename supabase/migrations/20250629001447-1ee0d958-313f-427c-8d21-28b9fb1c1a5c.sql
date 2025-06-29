
-- First, drop the existing problematic RLS policies
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON public.admin_users;

-- Create a security definer function to check admin status safely
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = user_uuid AND is_admin = true
  );
$$;

-- Create new RLS policies using the security definer function
CREATE POLICY "Users can view their own admin record" 
  ON public.admin_users 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all admin records" 
  ON public.admin_users 
  FOR SELECT 
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Users can insert their own admin record" 
  ON public.admin_users 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all admin records" 
  ON public.admin_users 
  FOR UPDATE 
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete admin records" 
  ON public.admin_users 
  FOR DELETE 
  USING (public.is_admin_user(auth.uid()));
