
CREATE TABLE public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  primary_reward JSONB NOT NULL,
  delivery JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  amount_paid NUMERIC,
  currency TEXT DEFAULT 'USD',
  shipping_fee NUMERIC DEFAULT 5,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reward_claims TO anon, authenticated;
GRANT ALL ON public.reward_claims TO service_role;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert claims" ON public.reward_claims FOR INSERT WITH CHECK (true);
CREATE POLICY "read own claims by session" ON public.reward_claims FOR SELECT USING (true);
CREATE POLICY "update own claims" ON public.reward_claims FOR UPDATE USING (true);

CREATE TABLE public.reward_bonus_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.reward_claims(id) ON DELETE CASCADE,
  bonus_items JSONB NOT NULL,
  recipient_type TEXT DEFAULT 'self',
  recipient JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  amount_paid NUMERIC,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reward_bonus_bundles TO anon, authenticated;
GRANT ALL ON public.reward_bonus_bundles TO service_role;
ALTER TABLE public.reward_bonus_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert bundles" ON public.reward_bonus_bundles FOR INSERT WITH CHECK (true);
CREATE POLICY "read bundles" ON public.reward_bonus_bundles FOR SELECT USING (true);
CREATE POLICY "update bundles" ON public.reward_bonus_bundles FOR UPDATE USING (true);

CREATE TRIGGER trg_reward_claims_updated BEFORE UPDATE ON public.reward_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reward_bundles_updated BEFORE UPDATE ON public.reward_bonus_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reward_claims_session ON public.reward_claims(session_id);
CREATE INDEX idx_reward_bundles_claim ON public.reward_bonus_bundles(claim_id);
