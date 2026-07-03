-- Enforce one reward claim per authenticated user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_user_id_unique
ON public.reward_claims(user_id)
WHERE user_id IS NOT NULL;