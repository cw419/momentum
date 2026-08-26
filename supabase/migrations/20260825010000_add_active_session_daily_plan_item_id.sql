-- Preserve the originating daily-plan unit while a task is active, so a
-- completed or early-completed session can close that exact unit.
ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS daily_plan_item_id text;

COMMENT ON COLUMN public.active_sessions.daily_plan_item_id IS
  'Daily plan item that launched this active session; null for direct starts.';
