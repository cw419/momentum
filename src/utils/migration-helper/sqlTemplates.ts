export function getBasicTableSQL(): string {
  return `
-- Create chains table
CREATE TABLE IF NOT EXISTS chains (
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

-- Create other tables...
-- (继续添加其他表的创建语句)
`;
}

export function getHierarchySQL(): string {
  return `
-- Add hierarchy support to chains table
DO $
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
END $;
`;
}

export function getTimeLimitSQL(): string {
  return `
-- Add time limit support to chains table
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'time_limit_hours'
  ) THEN
    ALTER TABLE chains ADD COLUMN time_limit_hours integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'time_limit_exceptions'
  ) THEN
    ALTER TABLE chains ADD COLUMN time_limit_exceptions jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'group_started_at'
  ) THEN
    ALTER TABLE chains ADD COLUMN group_started_at timestamp with time zone DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'group_expires_at'
  ) THEN
    ALTER TABLE chains ADD COLUMN group_expires_at timestamp with time zone DEFAULT NULL;
  END IF;
END $;
`;
}

export function getDurationlessSQL(): string {
  return `
-- Add durationless flag to chains table
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chains' AND column_name = 'is_durationless'
  ) THEN
    ALTER TABLE chains ADD COLUMN is_durationless boolean NOT NULL DEFAULT false;
  END IF;
END $;
`;
}

export function getRSIPSQL(): string {
  return `
-- Create RSIP tables
CREATE TABLE IF NOT EXISTS public.rsip_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.rsip_nodes(id) on delete cascade,
  title text not null,
  rule text not null,
  sort_order integer not null default 0,
  use_timer boolean not null default false,
  timer_minutes integer,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.rsip_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_added_at timestamptz,
  allow_multiple_per_day boolean not null default false
);

-- Enable RLS
ALTER TABLE IF EXISTS public.rsip_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rsip_meta ENABLE ROW LEVEL SECURITY;
`;
}
