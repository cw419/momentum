import type { RSIPNode } from '../../../types';

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

type RSIPNodeStrictPayload = RSIPNodeBasePayload & {
  emoji: string | null;
  stability_phase: string;
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
): RSIPNodeStrictPayload {
  return {
    ...buildBaseNodePayload(node, userId),
    emoji: node.emoji ?? null,
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
  options: { strict: true },
): RSIPNodeStrictPayload[];
export function buildRSIPNodeRows(
  nodes: RSIPNode[],
  userId: string,
  options: { strict: false },
): RSIPNodeBasePayload[];
export function buildRSIPNodeRows(
  nodes: RSIPNode[],
  userId: string,
  options: { strict: boolean },
): Array<RSIPNodeBasePayload | RSIPNodeStrictPayload> {
  return options.strict
    ? nodes.map((node) => buildStrictNodePayload(node, userId))
    : nodes.map((node) => buildBaseNodePayload(node, userId));
}
