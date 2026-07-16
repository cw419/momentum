import type {
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPStabilityPhase,
} from '../../../types';

type RSIPNodeBasePayload = {
  id: string;
  parent_id: string | null;
  title: string;
  rule: string;
  sort_order: number;
  created_at: string;
  use_timer: boolean;
  timer_minutes: number | null;
  user_id: string;
};

type RSIPNodePayload = RSIPNodeBasePayload & {
  emoji: string | null;
  type: string | null;
  group_id: string | null;
  reinforcement_level: number;
  max_reinforcement_level: number;
  cumulative_execution_days: number;
  is_passive: boolean;
  split_from_goal: string | null;
  stability_phase: RSIPStabilityPhase;
  phase_started_at: string | null;
  last_executed_at: string | null;
  last_violated_at: string | null;
  consecutive_executions: number;
  consecutive_violations: number;
  total_executions: number;
  total_violations: number;
};

function buildBaseNodePayload(
  node: RSIPNode,
  userId: string,
): RSIPNodeBasePayload {
  return {
    id: node.id,
    parent_id: node.parentId || null,
    title: node.title,
    rule: node.rule,
    sort_order: node.sortOrder,
    created_at: node.createdAt.toISOString(),
    use_timer: node.useTimer ?? false,
    timer_minutes: node.timerMinutes ?? null,
    user_id: userId,
  };
}

function buildStrictNodePayload(
  node: RSIPNode,
  userId: string,
): RSIPNodePayload {
  return {
    ...buildBaseNodePayload(node, userId),
    emoji: node.emoji ?? null,
    type: node.type ?? null,
    group_id: node.groupId ?? null,
    reinforcement_level: node.reinforcementLevel ?? 0,
    max_reinforcement_level: node.maxReinforcementLevel ?? 0,
    cumulative_execution_days: node.cumulativeExecutionDays ?? 0,
    is_passive: node.isPassive ?? false,
    split_from_goal: node.splitFromGoal ?? null,
    stability_phase: node.stabilityPhase ?? 'E0',
    phase_started_at: node.phaseStartedAt?.toISOString() ?? null,
    last_executed_at: node.lastExecutedAt?.toISOString() ?? null,
    last_violated_at: node.lastViolatedAt?.toISOString() ?? null,
    consecutive_executions: node.consecutiveExecutions ?? 0,
    consecutive_violations: node.consecutiveViolations ?? 0,
    total_executions: node.totalExecutions ?? 0,
    total_violations: node.totalViolations ?? 0,
  };
}

export function buildRSIPNodeRows(
  nodes: RSIPNode[],
  userId: string,
): RSIPNodePayload[] {
  return nodes.map((node) => buildStrictNodePayload(node, userId));
}

export function buildRSIPMetaRow(meta: RSIPMeta, userId: string) {
  return {
    user_id: userId,
    last_added_at: meta.lastAddedAt?.toISOString() ?? null,
    allow_multiple_per_day: !!meta.allowMultiplePerDay,
    last_tree_opened_at: meta.lastTreeOpenedAt?.toISOString() ?? null,
    daily_tree_open_required: meta.dailyTreeOpenRequired ?? false,
    tree_open_streak: meta.treeOpenStreak ?? 0,
    current_run_number: meta.currentRunNumber ?? null,
    current_run_started_at: meta.currentRunStartedAt?.toISOString() ?? null,
  };
}

export function buildRSIPLibraryRows(
  entries: RSIPLibraryEntry[],
  userId: string,
) {
  const updatedAt = new Date().toISOString();
  return entries.map((entry) => ({
    id: entry.id,
    user_id: userId,
    title: entry.title,
    rule: entry.rule,
    type: entry.type ?? null,
    emoji: entry.emoji ?? null,
    cumulative_execution_days: entry.cumulativeExecutionDays,
    internalization_progress: entry.internalizationProgress,
    last_active_at: entry.lastActiveAt.toISOString(),
    times_used: entry.timesUsed,
    use_timer: entry.useTimer ?? false,
    timer_minutes: entry.timerMinutes ?? null,
    is_passive: entry.isPassive ?? false,
    updated_at: updatedAt,
  }));
}
