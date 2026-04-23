
-- 1. Restrict payment_proofs UPDATE to admins only
DROP POLICY IF EXISTS "Admins can update payment proofs" ON public.payment_proofs;
CREATE POLICY "Admins can update payment proofs"
ON public.payment_proofs
FOR UPDATE
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- 2. Restrict chat_sessions SELECT to owner / session-id holder / admins
DROP POLICY IF EXISTS "Users can view their chat sessions" ON public.chat_sessions;
CREATE POLICY "Participants can view chat sessions"
ON public.chat_sessions
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (session_id = COALESCE(((current_setting('request.headers', true))::jsonb ->> 'x-session-id'), ''))
  OR public.is_admin_user(auth.uid())
);

-- Restrict chat_sessions UPDATE similarly (was 'true')
DROP POLICY IF EXISTS "Anyone can update chat sessions" ON public.chat_sessions;
CREATE POLICY "Participants can update chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (session_id = COALESCE(((current_setting('request.headers', true))::jsonb ->> 'x-session-id'), ''))
  OR public.is_admin_user(auth.uid())
);

-- 3. Restrict chat_messages SELECT to participants of the session
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
CREATE POLICY "Participants can view chat messages"
ON public.chat_messages
FOR SELECT
USING (
  chat_session_id IN (
    SELECT id FROM public.chat_sessions
    WHERE (auth.uid() IS NOT NULL AND user_id = auth.uid())
       OR (session_id = COALESCE(((current_setting('request.headers', true))::jsonb ->> 'x-session-id'), ''))
  )
  OR public.is_admin_user(auth.uid())
);

-- 4. Public-safe tracking lookup RPC for the /track page
CREATE OR REPLACE FUNCTION public.get_order_by_tracking_code(_code text)
RETURNS TABLE (
  id uuid,
  tracking_code text,
  status text,
  full_name text,
  city text,
  state text,
  country text,
  created_at timestamptz,
  updated_at timestamptz,
  total_amount numeric,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id,
         o.tracking_code,
         o.status::text,
         o.full_name,
         o.city,
         o.state,
         o.country,
         o.created_at,
         o.updated_at,
         o.total_amount,
         o.currency
  FROM public.orders o
  WHERE o.tracking_code = upper(trim(_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_tracking_code(text) TO anon, authenticated;
