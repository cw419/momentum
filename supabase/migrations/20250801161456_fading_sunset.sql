-- Keep the legacy follow-up migration idempotent for existing deployments.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE chains ADD COLUMN parent_id uuid REFERENCES chains(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'type'
  ) THEN
    ALTER TABLE chains ADD COLUMN "type" text NOT NULL DEFAULT 'unit';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE chains ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chains_parent_id ON chains(parent_id);
CREATE INDEX IF NOT EXISTS idx_chains_type ON chains("type");
CREATE INDEX IF NOT EXISTS idx_chains_parent_sort ON chains(parent_id, sort_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chains_type_check'
  ) THEN
    ALTER TABLE chains ADD CONSTRAINT chains_type_check
      CHECK ("type" IN ('unit', 'group', 'assault', 'recon', 'command', 'special_ops', 'engineering', 'quartermaster'));
  END IF;
END $$;

UPDATE chains SET "type" = 'unit' WHERE "type" IS NULL;
