-- Drop the restrictive policy that only shows followed users' statuses
DROP POLICY IF EXISTS "Users can view statuses from users they follow or their own" ON public.user_statuses;

-- Create a new policy that allows viewing all active (non-expired) statuses
CREATE POLICY "Anyone can view active statuses"
ON public.user_statuses
FOR SELECT
USING (
  (expires_at > now()) OR (user_id = auth.uid())
);
