import { z } from 'zod';

export const rsipNodeRowSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  title: z.string(),
  rule: z.string(),
  sort_order: z.number(),
  created_at: z.string().nullable(),
  use_timer: z.boolean().nullable().optional(),
  timer_minutes: z.number().nullable().optional(),
  emoji: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  group_id: z.string().nullable().optional(),
  reinforcement_level: z.number().nullable().optional(),
  max_reinforcement_level: z.number().nullable().optional(),
  cumulative_execution_days: z.number().nullable().optional(),
  is_passive: z.boolean().nullable().optional(),
  split_from_goal: z.string().nullable().optional(),
  stability_phase: z.string().nullable().optional(),
  phase_started_at: z.string().nullable(),
  last_executed_at: z.string().nullable(),
  last_violated_at: z.string().nullable(),
  consecutive_executions: z.number().nullable().optional(),
  consecutive_violations: z.number().nullable().optional(),
  total_executions: z.number().nullable().optional(),
  total_violations: z.number().nullable().optional(),
  user_id: z.string(),
});

export const rsipMetaRowSchema = z.object({
  user_id: z.string(),
  last_added_at: z.string().nullable(),
  allow_multiple_per_day: z.boolean(),
  last_tree_opened_at: z.string().nullable().optional(),
  daily_tree_open_required: z.boolean().nullable().optional(),
  tree_open_streak: z.number().nullable().optional(),
  current_run_number: z.number().nullable().optional(),
  current_run_started_at: z.string().nullable().optional(),
});

export const rsipGroupRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  fault_tolerance: z.number(),
  emoji: z.unknown().optional(),
  created_at: z.unknown(),
});

export const rsipLibraryEntryRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  rule: z.string(),
  type: z.unknown().optional(),
  emoji: z.unknown().optional(),
  cumulative_execution_days: z.number(),
  internalization_progress: z.number(),
  last_active_at: z.unknown(),
  times_used: z.number(),
  use_timer: z.boolean(),
  timer_minutes: z.number().nullable().optional(),
  is_passive: z.boolean(),
});

export const rsipRunRecordRowSchema = z.object({
  run_number: z.number(),
  started_at: z.unknown(),
  ended_at: z.unknown().optional(),
  max_node_count: z.number(),
  duration_days: z.number(),
  collapse_reason: z.unknown().optional(),
  collapse_node_title: z.unknown().optional(),
});

export const rsipTaskLinkRowSchema = z.object({
  id: z.string(),
  rsip_node_id: z.string(),
  chain_id: z.string(),
  chain_kind: z.unknown().optional(),
  trigger_event: z.unknown(),
  effect: z.unknown(),
  automation: z.unknown().optional(),
  is_active: z.boolean().optional(),
  updated_at: z.unknown(),
});

export const rsipExecutionRecordRowSchema = z.object({
  id: z.string(),
  node_id: z.string(),
  executed_at: z.unknown(),
  status: z.unknown().optional(),
  notes: z.unknown().optional(),
  reason_code: z.unknown().optional(),
  repair_hint: z.unknown().optional(),
  source_chain_id: z.unknown().optional(),
  source_event: z.unknown().optional(),
});

export type RSIPNodeRowParsed = z.infer<typeof rsipNodeRowSchema>;
export type RSIPMetaRowParsed = z.infer<typeof rsipMetaRowSchema>;
