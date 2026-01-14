-- Adds missing chain repeat + durationless metadata columns used by the app.
-- Safe to apply multiple times (uses IF NOT EXISTS guards).

DO $MIGRATION$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chains' AND column_name = 'minimum_duration'
  ) THEN
    ALTER TABLE public.chains ADD COLUMN minimum_duration integer;
    COMMENT ON COLUMN public.chains.minimum_duration IS 'Minimum duration (minutes) for durationless tasks';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chains' AND column_name = 'is_task_group'
  ) THEN
    ALTER TABLE public.chains ADD COLUMN is_task_group boolean DEFAULT false;
    COMMENT ON COLUMN public.chains.is_task_group IS 'Whether the chain represents a task-group repeat container';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chains' AND column_name = 'task_repeat_count'
  ) THEN
    ALTER TABLE public.chains ADD COLUMN task_repeat_count integer;
    COMMENT ON COLUMN public.chains.task_repeat_count IS 'Repeat count for a single task within a group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chains' AND column_name = 'group_repeat_count'
  ) THEN
    ALTER TABLE public.chains ADD COLUMN group_repeat_count integer;
    COMMENT ON COLUMN public.chains.group_repeat_count IS 'Repeat count for the whole group';
  END IF;
END $MIGRATION$;

