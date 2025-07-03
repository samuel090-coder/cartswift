-- Check and update RLS policies for gift card payments admin access
-- First, ensure admins can view all gift card payments
DROP POLICY IF EXISTS "Admins can view all gift card payments" ON public.gift_card_payments;
CREATE POLICY "Admins can view all gift card payments" ON public.gift_card_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Also ensure admins can update gift card payments if needed
DROP POLICY IF EXISTS "Admins can update gift card payments" ON public.gift_card_payments;
CREATE POLICY "Admins can update gift card payments" ON public.gift_card_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Ensure payment proofs admin policies exist
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON public.payment_proofs;
CREATE POLICY "Admins can view all payment proofs" ON public.payment_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );