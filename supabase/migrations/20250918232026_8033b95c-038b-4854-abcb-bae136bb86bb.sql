-- Fix search path for the update function - drop dependencies first
DROP TRIGGER IF EXISTS update_share_settings_updated_at ON public.share_settings;
DROP FUNCTION IF EXISTS public.update_share_settings_updated_at();

-- Recreate function with proper search path
CREATE OR REPLACE FUNCTION public.update_share_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_share_settings_updated_at
  BEFORE UPDATE ON public.share_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_share_settings_updated_at();