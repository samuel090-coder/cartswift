REVOKE EXECUTE ON FUNCTION public.prepare_seller_order_and_referral() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_chat_product_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_chat_commission_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_seller_orders_with_checkout() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.chat_product_commissions
  ALTER COLUMN commission_rate SET DEFAULT 0.10;

CREATE OR REPLACE FUNCTION public.record_chat_product_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_amount numeric;
  v_subtotal numeric;
BEGIN
  IF NEW.referral_message_id IS NULL THEN RETURN NEW; END IF;

  SELECT dm.sender_id INTO v_referrer
  FROM public.direct_messages dm
  WHERE dm.id = NEW.referral_message_id
    AND dm.tagged_seller_product_id = NEW.seller_product_id;
  IF v_referrer IS NULL THEN RETURN NEW; END IF;

  v_subtotal := round(NEW.price_at_purchase * NEW.quantity, 2);
  v_amount := round(LEAST(NEW.commission_amount, v_subtotal * 0.10), 2);
  IF v_amount <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.chat_product_commissions (
    referrer_id, referral_message_id, seller_order_id, order_amount,
    commission_rate, commission_earned, status
  ) VALUES (
    v_referrer, NEW.referral_message_id, NEW.id, v_subtotal,
    CASE WHEN v_subtotal > 0 THEN v_amount / v_subtotal ELSE 0 END,
    v_amount,
    CASE WHEN NEW.status = 'cancelled' THEN 'cancelled'
         WHEN NEW.status = 'completed' THEN 'earned'
         ELSE 'pending' END
  ) ON CONFLICT (seller_order_id) DO NOTHING;
  RETURN NEW;
END;
$$;