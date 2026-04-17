-- Add tracking_code to orders for public lookup
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code TEXT UNIQUE;

-- Function to generate a friendly tracking code
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'CS-';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-assign tracking_code on insert
CREATE OR REPLACE FUNCTION public.assign_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.tracking_code IS NULL THEN
    LOOP
      new_code := public.generate_tracking_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE tracking_code = new_code);
      attempts := attempts + 1;
      IF attempts > 10 THEN
        new_code := 'CS-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
        EXIT;
      END IF;
    END LOOP;
    NEW.tracking_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_tracking_code ON public.orders;
CREATE TRIGGER trg_assign_tracking_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_tracking_code();

-- Backfill existing orders without a tracking_code
UPDATE public.orders
SET tracking_code = public.generate_tracking_code()
WHERE tracking_code IS NULL;

-- Allow public lookup of an order by tracking_code (limited fields exposed via app query)
DROP POLICY IF EXISTS "Public can view orders by tracking code" ON public.orders;
CREATE POLICY "Public can view orders by tracking code"
ON public.orders
FOR SELECT
USING (tracking_code IS NOT NULL);

-- Allow public to view tracking updates (read-only)
DROP POLICY IF EXISTS "Public can view order tracking" ON public.order_tracking;
CREATE POLICY "Public can view order tracking"
ON public.order_tracking
FOR SELECT
USING (true);

-- Allow admins to insert/update/delete tracking entries
DROP POLICY IF EXISTS "Admins can manage order tracking" ON public.order_tracking;
CREATE POLICY "Admins can manage order tracking"
ON public.order_tracking
FOR ALL
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));