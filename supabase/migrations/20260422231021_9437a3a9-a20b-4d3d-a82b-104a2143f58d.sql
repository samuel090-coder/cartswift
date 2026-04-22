-- Function to broadcast new product email to all users with email
CREATE OR REPLACE FUNCTION public.broadcast_new_product_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $$
DECLARE
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZnNucXVteWRmbWludm1xeWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzcwMDIsImV4cCI6MjA2NjcxMzAwMn0.u9yL-M4ePbFxrkifl5GQlExtib5FCU3-84BiBYxCDCE';
  v_user RECORD;
  v_image text;
BEGIN
  v_image := CASE WHEN NEW.images IS NOT NULL AND array_length(NEW.images,1) > 0 THEN NEW.images[1] ELSE NULL END;

  FOR v_user IN
    SELECT email, full_name FROM public.profiles
    WHERE email IS NOT NULL AND email <> ''
  LOOP
    BEGIN
      PERFORM net.http_post(
        url     := 'https://qcfsnqumydfminvmqyfp.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || v_anon_key,
          'apikey', v_anon_key
        ),
        body    := jsonb_build_object(
          'type','new_product_announcement',
          'userEmail', v_user.email,
          'data', jsonb_build_object(
            'userName', COALESCE(v_user.full_name, 'there'),
            'productName', NEW.title,
            'productDescription', COALESCE(NEW.description, ''),
            'productPrice', NEW.price,
            'currency', COALESCE(NEW.currency, 'USD'),
            'productImage', v_image,
            'productId', NEW.id,
            'category', NEW.category
          )
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't block insertion if a single email enqueue fails
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_new_product_email ON public.items;
CREATE TRIGGER trg_broadcast_new_product_email
AFTER INSERT ON public.items
FOR EACH ROW EXECUTE FUNCTION public.broadcast_new_product_email();