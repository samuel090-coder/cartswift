ALTER TABLE public.order_items ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE public.order_items
  ADD COLUMN seller_product_id uuid REFERENCES public.seller_products(id) ON DELETE SET NULL,
  ADD COLUMN chat_referral_message_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  ADD COLUMN seller_product_title text,
  ADD COLUMN seller_product_image text,
  ADD COLUMN seller_product_currency text,
  ADD COLUMN seller_id uuid;

ALTER TABLE public.seller_orders
  ADD COLUMN checkout_order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN referral_message_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;

CREATE TABLE public.chat_product_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_message_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  seller_order_id uuid NOT NULL UNIQUE REFERENCES public.seller_orders(id) ON DELETE CASCADE,
  order_amount numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.05,
  commission_earned numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_product_commissions TO authenticated;
GRANT ALL ON public.chat_product_commissions TO service_role;
ALTER TABLE public.chat_product_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sharers can view their own chat commissions"
  ON public.chat_product_commissions FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

CREATE INDEX chat_product_commissions_referrer_created_idx
  ON public.chat_product_commissions (referrer_id, created_at DESC);
CREATE INDEX seller_orders_checkout_order_idx
  ON public.seller_orders (checkout_order_id);

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

  IF NEW.referral_message_id IS NOT NULL THEN
    SELECT dm.sender_id INTO v_referrer
    FROM public.direct_messages dm
    WHERE dm.id = NEW.referral_message_id
      AND dm.tagged_seller_product_id = NEW.seller_product_id;

    IF v_referrer IS NULL
       OR v_referrer = v_product.seller_id
       OR v_referrer = auth.uid() THEN
      NEW.referral_message_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prepare_seller_order_and_referral_trigger
  BEFORE INSERT ON public.seller_orders
  FOR EACH ROW EXECUTE FUNCTION public.prepare_seller_order_and_referral();

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
  v_amount := round(LEAST(NEW.commission_amount, v_subtotal * 0.05), 2);
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

CREATE TRIGGER record_chat_product_commission_trigger
  AFTER INSERT ON public.seller_orders
  FOR EACH ROW EXECUTE FUNCTION public.record_chat_product_commission();

CREATE OR REPLACE FUNCTION public.sync_chat_commission_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.chat_product_commissions
    SET status = CASE
      WHEN NEW.status = 'completed' THEN 'earned'
      WHEN NEW.status = 'cancelled' THEN 'cancelled'
      ELSE 'pending'
    END,
    updated_at = now()
    WHERE seller_order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_chat_commission_status_trigger
  AFTER UPDATE OF status ON public.seller_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_chat_commission_status();

CREATE OR REPLACE FUNCTION public.sync_seller_orders_with_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_status text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_seller_status := CASE NEW.status::text
    WHEN 'delivered' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE NEW.status::text
  END;
  UPDATE public.seller_orders
  SET status = v_seller_status
  WHERE checkout_order_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_seller_orders_with_checkout_trigger
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_seller_orders_with_checkout();

CREATE TRIGGER update_chat_product_commissions_updated_at
  BEFORE UPDATE ON public.chat_product_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();