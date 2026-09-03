-- Add a same-user parent relationship for RSIP policy groups.
ALTER TABLE public.rsip_groups
  ADD COLUMN IF NOT EXISTS parent_group_id uuid;

ALTER TABLE public.rsip_groups
  DROP CONSTRAINT IF EXISTS rsip_groups_parent_not_self;

ALTER TABLE public.rsip_groups
  ADD CONSTRAINT rsip_groups_parent_not_self
  CHECK (parent_group_id IS NULL OR parent_group_id <> id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rsip_groups_user_parent_fkey'
      AND conrelid = 'public.rsip_groups'::regclass
  ) THEN
    ALTER TABLE public.rsip_groups
      ADD CONSTRAINT rsip_groups_user_parent_fkey
      FOREIGN KEY (user_id, parent_group_id)
      REFERENCES public.rsip_groups(user_id, id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_rsip_groups_parent
  ON public.rsip_groups(user_id, parent_group_id);
