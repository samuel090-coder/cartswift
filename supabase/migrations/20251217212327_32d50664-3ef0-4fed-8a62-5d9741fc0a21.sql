-- Update RLS policies to read anonymous session id from request header `x-session-id`
-- This makes session-scoped notifications work without requiring Supabase Auth.

-- push_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (
  session_id = COALESCE((current_setting('request.headers', true)::json ->> 'x-session-id'), '')
);

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (
  session_id = COALESCE((current_setting('request.headers', true)::json ->> 'x-session-id'), '')
);

-- in_app_notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.in_app_notifications;

CREATE POLICY "Users can view their notifications"
ON public.in_app_notifications
FOR SELECT
USING (
  session_id = COALESCE((current_setting('request.headers', true)::json ->> 'x-session-id'), '')
  OR session_id IS NULL
);

CREATE POLICY "Users can update their notifications"
ON public.in_app_notifications
FOR UPDATE
USING (
  session_id = COALESCE((current_setting('request.headers', true)::json ->> 'x-session-id'), '')
  OR session_id IS NULL
);
