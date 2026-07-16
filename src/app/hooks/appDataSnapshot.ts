import type { MomentumStorage } from '../../storage/MomentumStorage';
import { toError } from '../../utils/errorMessage';
import { logger } from '../../utils/logger';
import { reconcileRSIPMetaWithNodes } from '../../utils/rsipDailyLimit';

async function loadWithFallback<T>(params: {
  load: () => Promise<T>;
  fallback: T;
  message: string;
  level: 'error' | 'warn';
  onError?: () => void;
}): Promise<T> {
  try {
    return await params.load();
  } catch (error) {
    params.onError?.();
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
  let didLoadRSIPNodes = true;
  let didLoadRSIPMeta = true;
  const [
    chains,
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
      onError: () => {
        didLoadRSIPNodes = false;
      },
    }),
    loadWithFallback({
      load: () => storage.getRSIPMeta(),
      fallback: {},
      message: 'Failed to load RSIP meta',
      level: 'warn',
      onError: () => {
        didLoadRSIPMeta = false;
      },
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

  const reconciledRSIPMeta = didLoadRSIPNodes
    ? reconcileRSIPMetaWithNodes(rsipMeta, rsipNodes)
    : rsipMeta;
  if (didLoadRSIPMeta && reconciledRSIPMeta !== rsipMeta) {
    await loadWithFallback({
      load: () => storage.saveRSIPMeta(reconciledRSIPMeta),
      fallback: undefined,
      message: 'Failed to reconcile RSIP meta with committed nodes',
      level: 'warn',
    });
  }

  return {
    chains,
    scheduledSessions,
    activeSession,
    completionHistory,
    rsipNodes,
    rsipMeta: reconciledRSIPMeta,
    rsipGroups,
    rsipPolicyLibrary,
    rsipRunHistory,
    rsipTaskLinks,
    rsipExecutionRecords,
    taskTimeStats,
  };
}
