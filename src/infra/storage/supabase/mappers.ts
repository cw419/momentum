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
  const sanitizeString = (value: unknown, fallback: string = ''): string => {
    if (typeof value === 'string') return value;
    if (value == null) return fallback;
    return String(value);
  };

  const sanitizeInt = (value: unknown, fallback: number): number => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.trunc(num);
  };

  const sanitizeBool = (value: unknown, fallback: boolean): boolean => {
    if (typeof value === 'boolean') return value;
    return fallback;
  };

  const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter(v => typeof v === 'string');
  };

  const sanitizeIsoDate = (value: unknown): string | null => {
    if (value == null) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
      return null;
    }

    return null;
  };

  let parentId = chain.parentId || null;
  if (parentId === chain.id) {
    parentId = null;
  }

  const createdAtIso = sanitizeIsoDate(chain.createdAt) ?? new Date().toISOString();
  const lastCompletedAtIso = sanitizeIsoDate(chain.lastCompletedAt);

  const base: any = {
    id: sanitizeString(chain.id),
    name: sanitizeString(chain.name),
    parent_id: typeof parentId === 'string' && parentId.trim() ? parentId : null,
    type: sanitizeString(chain.type || 'unit', 'unit'),
    sort_order: sanitizeInt(chain.sortOrder, Math.floor(Date.now() / 1000)),
    trigger: sanitizeString(chain.trigger),
    duration: sanitizeInt(chain.duration, 45),
    description: sanitizeString(chain.description),
    current_streak: sanitizeInt(chain.currentStreak, 0),
    auxiliary_streak: sanitizeInt(chain.auxiliaryStreak, 0),
    total_completions: sanitizeInt(chain.totalCompletions, 0),
    total_failures: sanitizeInt(chain.totalFailures, 0),
    auxiliary_failures: sanitizeInt(chain.auxiliaryFailures, 0),
    exceptions: sanitizeStringArray(chain.exceptions),
    auxiliary_exceptions: sanitizeStringArray(chain.auxiliaryExceptions),
    auxiliary_signal: sanitizeString(chain.auxiliarySignal),
    auxiliary_duration: sanitizeInt(chain.auxiliaryDuration, 15),
    auxiliary_completion_trigger: sanitizeString(chain.auxiliaryCompletionTrigger),
    created_at: createdAtIso,
    last_completed_at: lastCompletedAtIso,
    user_id: userId,
  };

  if (!includeNewColumns) return base;

  return {
    ...base,
    is_durationless: sanitizeBool(chain.isDurationless, false),
    time_limit_hours: chain.timeLimitHours != null ? sanitizeInt(chain.timeLimitHours, 0) : null,
    time_limit_exceptions: sanitizeStringArray(chain.timeLimitExceptions),
    group_started_at: sanitizeIsoDate(chain.groupStartedAt),
    group_expires_at: sanitizeIsoDate(chain.groupExpiresAt),
    deleted_at: sanitizeIsoDate(chain.deletedAt),
  } as any;
}

