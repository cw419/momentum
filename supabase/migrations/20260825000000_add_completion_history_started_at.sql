-- Preserve the actual session start for every future completion so the daily
-- timeline can represent direct task starts as well as daily-plan starts.
ALTER TABLE public.completion_history
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

COMMENT ON COLUMN public.completion_history.started_at IS
  'Actual focus-session start time. Existing history is intentionally left null.';
