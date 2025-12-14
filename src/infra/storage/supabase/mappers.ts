import type { Chain, GroupChain, UnitChain } from '../../../types';

export function mapChainRowToChain(row: any): Chain {
  const common = {
    id: row.id,
    name: row.name,
    parentId: row.parent_id || undefined,
    sortOrder: row.sort_order,
    trigger: row.trigger,
    duration: row.duration,
    description: row.description,
    currentStreak: row.current_streak,
    auxiliaryStreak: row.auxiliary_streak,
    totalCompletions: row.total_completions,
    totalFailures: row.total_failures,
    auxiliaryFailures: row.auxiliary_failures,
    exceptions: Array.isArray(row.exceptions) ? (row.exceptions as string[]) : [],
    auxiliaryExceptions: Array.isArray(row.auxiliary_exceptions) ? (row.auxiliary_exceptions as string[]) : [],
    auxiliarySignal: row.auxiliary_signal,
    auxiliaryDuration: row.auxiliary_duration,
    auxiliaryCompletionTrigger: row.auxiliary_completion_trigger,
    isDurationless: (row as any).is_durationless ?? false,
    minimumDuration: (row as any).minimum_duration ?? undefined,
    taskRepeatCount: (row as any).task_repeat_count ?? undefined,
    timeLimitExceptions: Array.isArray((row as any).time_limit_exceptions) ? (row as any).time_limit_exceptions : [],
    deletedAt: (row as any).deleted_at ? new Date((row as any).deleted_at) : null,
    createdAt: new Date(row.created_at || Date.now()),
    lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at) : undefined,
  };

  if (row.type === 'group') {
    const result = {
      ...common,
      type: 'group',
      timeLimitHours: (row as any).time_limit_hours ?? undefined,
      groupStartedAt: (row as any).group_started_at ? new Date((row as any).group_started_at) : undefined,
      groupExpiresAt: (row as any).group_expires_at ? new Date((row as any).group_expires_at) : undefined,
      isTaskGroup: (row as any).is_task_group ?? (row as any).isTaskGroup ?? undefined,
      groupRepeatCount: (row as any).group_repeat_count ?? (row as any).groupRepeatCount ?? undefined,
    } satisfies GroupChain;
    return result;
  }

  const result = {
    ...common,
    type: (row.type ?? 'unit') as UnitChain['type'],
  } satisfies UnitChain;
  return result;
}

export function buildChainRow(chain: Chain, userId: string, includeNewColumns: boolean): any {
  let parentId = chain.parentId || null;
  if (parentId === chain.id) {
    parentId = null;
  }

  const base: any = {
    id: chain.id,
    name: chain.name,
    parent_id: parentId,
    type: chain.type || 'unit',
    sort_order: chain.sortOrder || Math.floor(Date.now() / 1000),
    trigger: chain.trigger,
    duration: chain.duration,
    description: chain.description,
    current_streak: chain.currentStreak,
    auxiliary_streak: chain.auxiliaryStreak,
    total_completions: chain.totalCompletions,
    total_failures: chain.totalFailures,
    auxiliary_failures: chain.auxiliaryFailures,
    exceptions: chain.exceptions,
    auxiliary_exceptions: chain.auxiliaryExceptions,
    auxiliary_signal: chain.auxiliarySignal,
    auxiliary_duration: chain.auxiliaryDuration,
    auxiliary_completion_trigger: chain.auxiliaryCompletionTrigger,
    created_at: chain.createdAt.toISOString(),
    last_completed_at: chain.lastCompletedAt?.toISOString(),
    user_id: userId,
  };

  if (!includeNewColumns) return base;

  return {
    ...base,
    is_durationless: chain.isDurationless ?? false,
    time_limit_hours: chain.timeLimitHours ?? null,
    time_limit_exceptions: chain.timeLimitExceptions ?? [],
    group_started_at: chain.groupStartedAt ? chain.groupStartedAt.toISOString() : null,
    group_expires_at: chain.groupExpiresAt ? chain.groupExpiresAt.toISOString() : null,
    deleted_at: chain.deletedAt?.toISOString() || null,
  } as any;
}

