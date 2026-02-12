/*
  Hotfix: align remote schema with app expectations from QA report (2026-02-11).
  Safe to re-run (uses IF NOT EXISTS / guarded blocks).
*/

-- Allow long-running one-time dedupe/index preparation on large tables.
SET statement_timeout = 0;
SET lock_timeout = '10s';

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) active_sessions forward-timer columns
ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS is_forward_timer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS forward_elapsed_time integer DEFAULT 0;

-- 2) chains repeat/duration metadata
ALTER TABLE public.chains
  ADD COLUMN IF NOT EXISTS minimum_duration integer,
  ADD COLUMN IF NOT EXISTS is_task_group boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS task_repeat_count integer,
  ADD COLUMN IF NOT EXISTS group_repeat_count integer;

-- 3) completion_history timing columns
ALTER TABLE public.completion_history
  ADD COLUMN IF NOT EXISTS actual_duration integer,
  ADD COLUMN IF NOT EXISTS is_forward_timed boolean DEFAULT false;

-- 4) rsip_nodes / rsip_meta / rsip_execution_records extensions
ALTER TABLE public.rsip_nodes
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS reinforcement_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_reinforcement_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_execution_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_passive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_from_goal text;

ALTER TABLE public.rsip_meta
  ADD COLUMN IF NOT EXISTS current_run_number integer,
  ADD COLUMN IF NOT EXISTS current_run_started_at timestamptz;

ALTER TABLE public.rsip_execution_records
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS repair_hint text,
  ADD COLUMN IF NOT EXISTS source_chain_id uuid,
  ADD COLUMN IF NOT EXISTS source_event text;

-- 5) rsip_groups
CREATE TABLE IF NOT EXISTS public.rsip_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  fault_tolerance integer NOT NULL DEFAULT 0 CHECK (fault_tolerance >= 0),
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rsip_groups_user
  ON public.rsip_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_rsip_groups_created
  ON public.rsip_groups(user_id, created_at DESC);

ALTER TABLE public.rsip_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rsip_nodes_group_id_fkey'
  ) THEN
    ALTER TABLE public.rsip_nodes
      ADD CONSTRAINT rsip_nodes_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES public.rsip_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6) rsip_policy_library
CREATE TABLE IF NOT EXISTS public.rsip_policy_library (
  id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  rule text NOT NULL,
  type text,
  emoji text,
  cumulative_execution_days integer NOT NULL DEFAULT 0,
  internalization_progress numeric(5,2) NOT NULL DEFAULT 0 CHECK (
    internalization_progress >= 0 AND internalization_progress <= 100
  ),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  times_used integer NOT NULL DEFAULT 0,
  use_timer boolean NOT NULL DEFAULT false,
  timer_minutes integer,
  is_passive boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_rsip_policy_library_user_updated
  ON public.rsip_policy_library(user_id, updated_at DESC);

ALTER TABLE public.rsip_policy_library ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
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

-- 7) rsip_run_history
CREATE TABLE IF NOT EXISTS public.rsip_run_history (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_number integer NOT NULL CHECK (run_number > 0),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  max_node_count integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 0,
  collapse_reason text,
  collapse_node_title text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_rsip_run_history_user
  ON public.rsip_run_history(user_id, run_number DESC);

ALTER TABLE public.rsip_run_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
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

-- 8) rsip_task_links
CREATE TABLE IF NOT EXISTS public.rsip_task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsip_node_id uuid NOT NULL REFERENCES public.rsip_nodes(id) ON DELETE CASCADE,
  chain_id uuid NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  chain_kind text NOT NULL CHECK (chain_kind IN ('group', 'unit')),
  trigger_event text NOT NULL CHECK (
    trigger_event IN (
      'task_completed',
      'task_interrupted',
      'group_cycle_completed',
      'rsip_mark_executed'
    )
  ),
  effect text NOT NULL CHECK (
    effect IN (
      'mark_rsip_executed',
      'mark_rsip_violated',
      'prompt_start_chain',
      'prompt_schedule_chain'
    )
  ),
  automation text NOT NULL DEFAULT 'confirm' CHECK (automation IN ('auto', 'confirm')),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rsip_task_links_key
  ON public.rsip_task_links(user_id, rsip_node_id, chain_id, trigger_event, effect);
CREATE INDEX IF NOT EXISTS idx_rsip_task_links_user
  ON public.rsip_task_links(user_id, updated_at DESC);

ALTER TABLE public.rsip_task_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
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

-- 9) Additional rsip indexes
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_group_id
  ON public.rsip_nodes(group_id);
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_reinforcement
  ON public.rsip_nodes(reinforcement_level);
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_is_passive
  ON public.rsip_nodes(is_passive);

-- 10) Deduplicate before adding unique indexes for upsert conflict targets.
-- Keep the latest row by id for each conflict key.
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_dedupe_support
  ON public.scheduled_sessions(user_id, chain_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_completion_history_dedupe_support
  ON public.completion_history(user_id, chain_id, completed_at, id DESC);

WITH duplicates AS (
  SELECT
    user_id,
    chain_id,
    MAX(id) AS keep_id
  FROM public.scheduled_sessions
  GROUP BY user_id, chain_id
  HAVING COUNT(*) > 1
)
DELETE FROM public.scheduled_sessions s
USING duplicates d
WHERE s.user_id = d.user_id
  AND s.chain_id = d.chain_id
  AND s.id <> d.keep_id;

WITH duplicates AS (
  SELECT
    user_id,
    chain_id,
    completed_at,
    MAX(id) AS keep_id
  FROM public.completion_history
  GROUP BY user_id, chain_id, completed_at
  HAVING COUNT(*) > 1
)
DELETE FROM public.completion_history h
USING duplicates d
WHERE h.user_id = d.user_id
  AND h.chain_id = d.chain_id
  AND h.completed_at = d.completed_at
  AND h.id <> d.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_sessions_user_chain_unique
  ON public.scheduled_sessions(user_id, chain_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_completion_history_user_chain_completed_unique
  ON public.completion_history(user_id, chain_id, completed_at);

ANALYZE public.scheduled_sessions;
ANALYZE public.completion_history;
