-- Base schema for Momentum chain and session data.

CREATE TABLE IF NOT EXISTS public.chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger text NOT NULL,
  duration integer NOT NULL DEFAULT 45,
  description text NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  auxiliary_streak integer NOT NULL DEFAULT 0,
  total_completions integer NOT NULL DEFAULT 0,
  total_failures integer NOT NULL DEFAULT 0,
  auxiliary_failures integer NOT NULL DEFAULT 0,
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  auxiliary_exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  auxiliary_signal text NOT NULL,
  auxiliary_duration integer NOT NULL DEFAULT 15,
  auxiliary_completion_trigger text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_completed_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid REFERENCES public.chains(id) ON DELETE CASCADE NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  auxiliary_signal text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid REFERENCES public.chains(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration integer NOT NULL,
  is_paused boolean NOT NULL DEFAULT false,
  paused_at timestamptz,
  total_paused_time integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.completion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid REFERENCES public.chains(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  duration integer NOT NULL,
  was_successful boolean NOT NULL,
  reason_for_failure text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chains' AND policyname = 'Users can manage their own chains') THEN
    CREATE POLICY "Users can manage their own chains" ON public.chains
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_sessions' AND policyname = 'Users can manage their own scheduled sessions') THEN
    CREATE POLICY "Users can manage their own scheduled sessions" ON public.scheduled_sessions
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'active_sessions' AND policyname = 'Users can manage their own active sessions') THEN
    CREATE POLICY "Users can manage their own active sessions" ON public.active_sessions
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'completion_history' AND policyname = 'Users can manage their own completion history') THEN
    CREATE POLICY "Users can manage their own completion history" ON public.completion_history
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chains_user_id ON public.chains(user_id);
CREATE INDEX IF NOT EXISTS idx_chains_created_at ON public.chains(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_user_id ON public.scheduled_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_expires_at ON public.scheduled_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_completion_history_user_id ON public.completion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_completion_history_chain_id ON public.completion_history(chain_id);
CREATE INDEX IF NOT EXISTS idx_completion_history_completed_at ON public.completion_history(completed_at DESC);
