CREATE OR REPLACE FUNCTION public.prepare_seller_order_and_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.seller_products%ROWTYPE;
  v_referrer uuid;
  v_rate numeric;
  v_subtotal numeric;
BEGIN
  SELECT * INTO v_product
  FROM public.seller_products
  WHERE id = NEW.seller_product_id
  FOR SHARE;

  IF NOT FOUND OR v_product.is_approved IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This seller product is unavailable';
  END IF;
  IF NEW.quantity < 1 OR NEW.quantity > v_product.stock_quantity THEN
    RAISE EXCEPTION 'The requested quantity is unavailable';
  END IF;

  v_rate := COALESCE(v_product.commission_rate, 0.12);
  IF v_rate > 1 THEN v_rate := v_rate / 100; END IF;
  v_rate := GREATEST(0, LEAST(v_rate, 1));
  v_subtotal := round(v_product.price * NEW.quantity, 2);

  NEW.seller_id := v_product.seller_id;
  NEW.price_at_purchase := v_product.price;
  NEW.commission_amount := round(v_subtotal * v_rate, 2);
  NEW.seller_earnings := v_subtotal - NEW.commission_amount;
  NEW.status := 'pending';

  IF NEW.checkout_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = NEW.checkout_order_id
      AND o.session_id = NEW.buyer_session_id
  ) THEN
    RAISE EXCEPTION 'Seller product is not connected to this checkout';
  END IF;

  IF NEW.referral_message_id IS NOT NULL THEN
    IF auth.uid() IS NULL THEN
      NEW.referral_message_id := NULL;
    ELSE
      SELECT dm.sender_id INTO v_referrer
      FROM public.direct_messages dm
      WHERE dm.id = NEW.referral_message_id
        AND dm.tagged_seller_product_id = NEW.seller_product_id;

      IF v_referrer IS NULL
         OR v_referrer = v_product.seller_id
         OR v_referrer = auth.uid()
         OR NOT EXISTS (
           SELECT 1 FROM public.order_items oi
           WHERE oi.order_id = NEW.checkout_order_id
             AND oi.seller_product_id = NEW.seller_product_id
             AND oi.quantity = NEW.quantity
             AND oi.chat_referral_message_id = NEW.referral_message_id
         ) THEN
        NEW.referral_message_id := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

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
  IF NEW.referral_message_id IS NULL OR NEW.checkout_order_id IS NULL THEN RETURN NEW; END IF;

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
    'pending'
  ) ON CONFLICT (seller_order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_chat_commission_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout_status text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT o.status::text INTO v_checkout_status
  FROM public.orders o
  WHERE o.id = NEW.checkout_order_id;

  UPDATE public.chat_product_commissions
  SET status = CASE
    WHEN v_checkout_status = 'delivered' AND NEW.status = 'completed' THEN 'earned'
    WHEN v_checkout_status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  updated_at = now()
  WHERE seller_order_id = NEW.id;
  RETURN NEW;
END;
$$;