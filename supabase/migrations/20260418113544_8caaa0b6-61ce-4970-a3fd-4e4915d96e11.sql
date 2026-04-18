-- 1. Allow admins to manage deposit_payment_methods
DROP POLICY IF EXISTS "Admins can manage deposit payment methods" ON public.deposit_payment_methods;
CREATE POLICY "Admins can manage deposit payment methods"
ON public.deposit_payment_methods
FOR ALL
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- 2. Insert global price format setting (full | compact). Admin can toggle from Notification Settings UI later.
INSERT INTO public.notification_settings (setting_key, setting_value, is_enabled)
VALUES ('price_display_format', '{"format":"full"}'::jsonb, true)
ON CONFLICT (setting_key) DO NOTHING;