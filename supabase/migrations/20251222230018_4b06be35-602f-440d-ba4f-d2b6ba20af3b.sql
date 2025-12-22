-- Fix linter: set immutable search_path on functions
ALTER FUNCTION public.create_admin_notifications() SET search_path = public;
ALTER FUNCTION public.generate_download_token() SET search_path = public;
ALTER FUNCTION public.is_admin_user(uuid) SET search_path = public;
