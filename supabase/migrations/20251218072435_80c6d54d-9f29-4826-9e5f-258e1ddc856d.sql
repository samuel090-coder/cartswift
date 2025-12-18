-- Allow upserts by permitting UPDATE for a user's own push subscription rows
-- (Upsert uses UPDATE when endpoint already exists)

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add UPDATE policy so upsert can succeed for the same session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users can update their own subscriptions'
  ) THEN
    CREATE POLICY "Users can update their own subscriptions"
    ON public.push_subscriptions
    FOR UPDATE
    USING (
      session_id = COALESCE(((current_setting('request.headers', true))::json ->> 'x-session-id'), '')
    )
    WITH CHECK (
      session_id = COALESCE(((current_setting('request.headers', true))::json ->> 'x-session-id'), '')
    );
  END IF;
END $$;

-- Helpful index for conflict target / lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_session_id ON public.push_subscriptions (session_id);
