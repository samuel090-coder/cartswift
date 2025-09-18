-- Fix search path for the update function
DROP FUNCTION IF EXISTS public.update_share_settings_updated_at();

CREATE OR REPLACE FUNCTION public.update_share_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;