import type { MomentumStorage } from '../../storage/MomentumStorage';
import { toError } from '../../utils/errorMessage';
import { logger } from '../../utils/logger';

async function loadWithFallback<T>(params: {
  load: () => Promise<T>;
  fallback: T;
  message: string;
  level: 'error' | 'warn';
}): Promise<T> {
  try {
    return await params.load();
  } catch (error) {
    logger[params.level](
      'APP_SHELL',
      params.message,
      undefined,
      toError(error),
    );
    return params.fallback;
  }
}

export async function loadAppDataSnapshot(storage: MomentumStorage) {
  const [
    chains,
    dailyPlans,
    scheduledSessions,
    activeSession,
    completionHistory,
    rsipNodes,
    rsipMeta,
    rsipGroups,
    rsipPolicyLibrary,
    rsipRunHistory,
    rsipTaskLinks,
    rsipExecutionRecords,
    taskTimeStats,
  ] = await Promise.all([
    loadWithFallback({
      load: () => storage.getActiveChains(),
      fallback: [],
      message: 'Failed to load chain data',
      level: 'error',
    }),
    loadWithFallback({
      load: () => storage.getDailyPlans(),
      fallback: [],
      message: 'Failed to load daily plans',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getScheduledSessions(),
      fallback: [],
      message: 'Failed to load scheduled sessions',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getActiveSession(),
      fallback: null,
      message: 'Failed to load active session',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getCompletionHistory(),
      fallback: [],
      message: 'Failed to load completion history',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getRSIPNodes(),
      fallback: [],
      message: 'Failed to load RSIP nodes',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getRSIPMeta(),
      fallback: {},
      message: 'Failed to load RSIP meta',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getRSIPGroups(),
      fallback: [],
      message: 'Failed to load RSIP groups',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getRSIPPolicyLibrary(),
      fallback: [],
      message: 'Failed to load RSIP policy library',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getRSIPRunHistory(),
      fallback: [],
      message: 'Failed to load RSIP run history',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getRSIPTaskLinks(),
      fallback: [],
      message: 'Failed to load RSIP task links',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getRSIPExecutionRecords(),
      fallback: [],
      message: 'Failed to load RSIP execution records',
      level: 'warn',
    }),
    loadWithFallback({
      load: () => storage.getTaskTimeStats(),
      fallback: [],
      message: 'Failed to load task time stats',
      level: 'warn',
    }),
  ]);

  return {
    chains,
    dailyPlans,
    scheduledSessions,
    activeSession,
    completionHistory,
    rsipNodes,
    rsipMeta,
    rsipGroups,
    rsipPolicyLibrary,
    rsipRunHistory,
    rsipTaskLinks,
    rsipExecutionRecords,
    taskTimeStats,
  };
}
