-- Daily plans are intentionally separate from CTDP chains: they allocate a chain
-- to a particular calendar day without changing that chain's own history.
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (user_id, plan_date)
);

ALTER TABLE public.chains
  ADD COLUMN IF NOT EXISTS task_direction text NOT NULL DEFAULT 'periodic',
  ADD COLUMN IF NOT EXISTS goal_completed_at timestamptz;

ALTER TABLE public.chains
  DROP CONSTRAINT IF EXISTS chains_task_direction_check;
ALTER TABLE public.chains
  ADD CONSTRAINT chains_task_direction_check
  CHECK (task_direction IN ('periodic', 'goal'));

ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own daily plans" ON public.daily_plans;
CREATE POLICY "Users manage own daily plans" ON public.daily_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
