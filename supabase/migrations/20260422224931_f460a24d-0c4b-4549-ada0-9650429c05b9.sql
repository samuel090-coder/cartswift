
-- 1. pg_net for outbound HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Notification.type -> email template mapping
CREATE OR REPLACE FUNCTION public.map_notification_to_email_type(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_type
    WHEN 'follow'          THEN 'new_follower'
    WHEN 'new_follower'    THEN 'new_follower'
    WHEN 'post_like'       THEN 'post_liked'
    WHEN 'post_liked'      THEN 'post_liked'
    WHEN 'post_comment'    THEN 'post_commented'
    WHEN 'post_commented'  THEN 'post_commented'
    WHEN 'profile_view'    THEN 'profile_viewed'
    WHEN 'status_view'     THEN 'seller_status_posted'
    WHEN 'status_reaction' THEN 'post_liked'
    WHEN 'earnings'        THEN 'status_payout'
    WHEN 'message'         THEN 'message_received'
    WHEN 'voice_message'   THEN 'voice_message_received'
    WHEN 'order'           THEN 'order_received'
    WHEN 'milestone'       THEN 'milestone_followers'
    ELSE p_type
  END;
$$;

-- 3. Trigger function that POSTs to send-email edge function via pg_net
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  v_email      text;
  v_email_type text;
  v_anon_key   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZnNucXVteWRmbWludm1xeWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzcwMDIsImV4cCI6MjA2NjcxMzAwMn0.u9yL-M4ePbFxrkifl5GQlExtib5FCU3-84BiBYxCDCE';
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = NEW.user_id;
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  v_email_type := public.map_notification_to_email_type(NEW.type);

  PERFORM net.http_post(
    url     := 'https://qcfsnqumydfminvmqyfp.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon_key,
      'apikey',        v_anon_key
    ),
    body    := jsonb_build_object(
      'type',      v_email_type,
      'userEmail', v_email,
      'userId',    NEW.related_user_id,
      'shortId',   NEW.related_item_id,
      'data',      jsonb_build_object(
        'title',      NEW.title,
        'body',       NEW.body,
        'icon_emoji', NEW.icon_emoji,
        'link_url',   NEW.link_url
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_notification_email ON public.user_notifications;
CREATE TRIGGER trg_send_notification_email
AFTER INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_notification_email();

-- 4. SECURITY FIX: orders table — drop ALL existing policies, then rebuild safely
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'public.orders'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', r.polname);
  END LOOP;
END $$;

CREATE POLICY "Buyers and admins can view orders"
ON public.orders FOR SELECT
USING (
  session_id = current_setting('request.headers', true)::jsonb ->> 'x-session-id'
  OR public.is_admin_user(auth.uid())
);

CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
USING (public.is_admin_user(auth.uid()));

-- 5. SECURITY FIX: user_statuses
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.user_statuses'::regclass
      AND polcmd IN ('w','d')  -- UPDATE, DELETE
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_statuses', r.polname);
  END LOOP;
END $$;

CREATE POLICY "Owners can update their statuses"
ON public.user_statuses FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their statuses"
ON public.user_statuses FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_status_view_count(p_status_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_statuses
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_status_id;
END;
$$;

-- 6. SECURITY FIX: admin_users — only existing admins manage admin rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.admin_users'::regclass
      AND polcmd IN ('a','w','d')  -- INSERT, UPDATE, DELETE
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_users', r.polname);
  END LOOP;
END $$;

CREATE POLICY "Only admins manage admin_users insert"
ON public.admin_users FOR INSERT
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Only admins manage admin_users update"
ON public.admin_users FOR UPDATE
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Only admins manage admin_users delete"
ON public.admin_users FOR DELETE
USING (public.is_admin_user(auth.uid()));

-- 7. Pin search_path on the one mutable function
ALTER FUNCTION public.update_profile_updated_at() SET search_path = public;
