CREATE TABLE IF NOT EXISTS public.reward_mystery_state (
  user_id uuid PRIMARY KEY,
  refresh_count integer NOT NULL DEFAULT 0,
  shown_titles text[] NOT NULL DEFAULT '{}',
  last_boxes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reward_mystery_state TO authenticated;
GRANT ALL ON public.reward_mystery_state TO service_role;

ALTER TABLE public.reward_mystery_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own mystery state"
  ON public.reward_mystery_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_reward_mystery_state_updated
BEFORE UPDATE ON public.reward_mystery_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();