/*
  RSIP process integration upgrade
  - Node reinforcement/group/split fields
  - Policy groups / library / run history / task links
  - RSIP execution record context fields
*/

-- 1) Extend rsip nodes
ALTER TABLE public.rsip_nodes
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS reinforcement_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_reinforcement_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_execution_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_passive BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS split_from_goal TEXT;

-- 2) Extend rsip meta
ALTER TABLE public.rsip_meta
  ADD COLUMN IF NOT EXISTS current_run_number INTEGER,
  ADD COLUMN IF NOT EXISTS current_run_started_at TIMESTAMPTZ;

-- 3) Extend execution records
ALTER TABLE public.rsip_execution_records
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS repair_hint TEXT,
  ADD COLUMN IF NOT EXISTS source_chain_id UUID,
  ADD COLUMN IF NOT EXISTS source_event TEXT;

-- 4) Policy groups
CREATE TABLE IF NOT EXISTS public.rsip_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  fault_tolerance INTEGER NOT NULL DEFAULT 0 CHECK (fault_tolerance >= 0),
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rsip_groups_user
  ON public.rsip_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_rsip_groups_created
  ON public.rsip_groups(user_id, created_at DESC);

ALTER TABLE public.rsip_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rsip_groups'
      AND policyname = 'Users manage own rsip groups'
  ) THEN
    CREATE POLICY "Users manage own rsip groups"
      ON public.rsip_groups
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Link group_id after table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rsip_nodes_group_id_fkey'
  ) THEN
    ALTER TABLE public.rsip_nodes
      ADD CONSTRAINT rsip_nodes_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES public.rsip_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5) Policy library
CREATE TABLE IF NOT EXISTS public.rsip_policy_library (
  id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rule TEXT NOT NULL,
  type TEXT,
  emoji TEXT,
  cumulative_execution_days INTEGER NOT NULL DEFAULT 0,
  internalization_progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (
    internalization_progress >= 0 AND internalization_progress <= 100
  ),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  times_used INTEGER NOT NULL DEFAULT 0,
  use_timer BOOLEAN NOT NULL DEFAULT FALSE,
  timer_minutes INTEGER,
  is_passive BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_rsip_policy_library_user_updated
  ON public.rsip_policy_library(user_id, updated_at DESC);

ALTER TABLE public.rsip_policy_library ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rsip_policy_library'
      AND policyname = 'Users manage own rsip policy library'
  ) THEN
    CREATE POLICY "Users manage own rsip policy library"
      ON public.rsip_policy_library
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 6) Run history
CREATE TABLE IF NOT EXISTS public.rsip_run_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL CHECK (run_number > 0),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  max_node_count INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 0,
  collapse_reason TEXT,
  collapse_node_title TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_rsip_run_history_user
  ON public.rsip_run_history(user_id, run_number DESC);

ALTER TABLE public.rsip_run_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rsip_run_history'
      AND policyname = 'Users manage own rsip run history'
  ) THEN
    CREATE POLICY "Users manage own rsip run history"
      ON public.rsip_run_history
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 7) Task links
CREATE TABLE IF NOT EXISTS public.rsip_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsip_node_id UUID NOT NULL REFERENCES public.rsip_nodes(id) ON DELETE CASCADE,
  chain_id UUID NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  chain_kind TEXT NOT NULL CHECK (chain_kind IN ('group', 'unit')),
  trigger_event TEXT NOT NULL CHECK (
    trigger_event IN (
      'task_completed',
      'task_interrupted',
      'group_cycle_completed',
      'rsip_mark_executed'
    )
  ),
  effect TEXT NOT NULL CHECK (
    effect IN (
      'mark_rsip_executed',
      'mark_rsip_violated',
      'prompt_start_chain',
      'prompt_schedule_chain'
    )
  ),
  automation TEXT NOT NULL DEFAULT 'confirm' CHECK (automation IN ('auto', 'confirm')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rsip_task_links_key
  ON public.rsip_task_links(user_id, rsip_node_id, chain_id, trigger_event, effect);

CREATE INDEX IF NOT EXISTS idx_rsip_task_links_user
  ON public.rsip_task_links(user_id, updated_at DESC);

ALTER TABLE public.rsip_task_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rsip_task_links'
      AND policyname = 'Users manage own rsip task links'
  ) THEN
    CREATE POLICY "Users manage own rsip task links"
      ON public.rsip_task_links
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 8) Additional indexes on rsip nodes
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_group_id
  ON public.rsip_nodes(group_id);
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_reinforcement
  ON public.rsip_nodes(reinforcement_level);
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_is_passive
  ON public.rsip_nodes(is_passive);

