-- Verification checks for momentumctdp Netlify QA report (2026-02-11)

-- A) Missing columns from reported 400s
SELECT 'active_sessions.is_forward_timer' AS check_item,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'active_sessions'
           AND column_name = 'is_forward_timer'
       ) AS is_present;

SELECT 'chains.group_repeat_count' AS check_item,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'chains'
           AND column_name = 'group_repeat_count'
       ) AS is_present;

-- B) RSIP extended tables from reported 404s
SELECT 'public.rsip_groups' AS check_item,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'rsip_groups'
       ) AS is_present;

SELECT 'public.rsip_policy_library' AS check_item,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'rsip_policy_library'
       ) AS is_present;

SELECT 'public.rsip_run_history' AS check_item,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'rsip_run_history'
       ) AS is_present;

SELECT 'public.rsip_task_links' AS check_item,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'rsip_task_links'
       ) AS is_present;

-- C) Upsert conflict target uniqueness from reported 42P10
SELECT 'idx_completion_history_user_chain_completed_unique' AS check_item,
       EXISTS (
         SELECT 1
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename = 'completion_history'
           AND indexname = 'idx_completion_history_user_chain_completed_unique'
       ) AS is_present;

-- D) Optional quick duplicate sanity
SELECT 'dup_completion_history_keys' AS check_item,
       COUNT(*)::bigint AS duplicate_groups
FROM (
  SELECT user_id, chain_id, completed_at
  FROM public.completion_history
  GROUP BY user_id, chain_id, completed_at
  HAVING COUNT(*) > 1
) t;

SELECT 'dup_scheduled_sessions_keys' AS check_item,
       COUNT(*)::bigint AS duplicate_groups
FROM (
  SELECT user_id, chain_id
  FROM public.scheduled_sessions
  GROUP BY user_id, chain_id
  HAVING COUNT(*) > 1
) t;
