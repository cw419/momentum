/*
  # Deduplicate + Unique Indexes (scheduled_sessions, completion_history)

  Purpose:
  - Enable efficient upserts from the app by enforcing natural uniqueness:
    - scheduled_sessions: one active scheduled session per (user_id, chain_id)
    - completion_history: one record per (user_id, chain_id, completed_at)
  - Remove any existing duplicates before adding UNIQUE indexes.

  Notes:
  - UNIQUE indexes (not constraints) are enough for Postgres ON CONFLICT targets.
  - We keep the "best" completion_history row when deduplicating (most populated fields).
*/

-- =========================
-- scheduled_sessions: dedupe
-- =========================

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, chain_id
      ORDER BY scheduled_at DESC, expires_at DESC, id DESC
    ) AS rn
  FROM public.scheduled_sessions
)
DELETE FROM public.scheduled_sessions s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;

-- =========================
-- completion_history: dedupe
-- =========================

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, chain_id, completed_at
      ORDER BY
        (actual_duration IS NOT NULL) DESC,
        (is_forward_timed IS NOT NULL) DESC,
        (description IS NOT NULL) DESC,
        (notes IS NOT NULL) DESC,
        id DESC
    ) AS rn
  FROM public.completion_history
)
DELETE FROM public.completion_history h
USING ranked r
WHERE h.id = r.id AND r.rn > 1;

-- =========================
-- Unique indexes for upsert
-- =========================

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_sessions_user_chain_unique
  ON public.scheduled_sessions(user_id, chain_id);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_completion_history_user_chain_completed_unique
  ON public.completion_history(user_id, chain_id, completed_at);

ANALYZE public.scheduled_sessions;
ANALYZE public.completion_history;

