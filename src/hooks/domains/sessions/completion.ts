import type { Dispatch, SetStateAction } from 'react';
import type { AppState, CompletionHistory } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { hasStorageCapability } from '../../../storage/ports';
import type { SafelySaveChains } from '../useChainsDomain';
import {
  incrementGroupCompletionCount,
  isGroupFullyCompleted,
  resetGroupCompletionCount,
} from '../../../utils/chainTree';
import { forwardTimerManager } from '../../../utils/forwardTimer';
import { logger } from '../../../utils/logger';
import { systemNotificationService } from '../../../services/platform/SystemNotificationService';
import { emitPointsChanged } from '../../../utils/pointsEvents';
import { queryOptimizer } from '../../../utils/queryOptimizer';
import { normalizeUnknownError } from '../../../utils/errors/normalizeError';
import type { RSIPTaskEventPayload } from '../../../services/rsip-integration/RSIPTaskIntegrationService';

type Chain = AppState['chains'][number];
type ActiveSession = NonNullable<AppState['activeSession']>;

function computeActualDuration(
  activeSession: ActiveSession,
  chain: Chain,
): number {
  if (!chain.isDurationless) return activeSession.duration;

  const sessionId = `${activeSession.chainId}_${activeSession.startedAt.getTime()}`;
  const elapsedSeconds = forwardTimerManager.stopTimer(sessionId);
  return Math.ceil(elapsedSeconds / 60);
}

function updateChainsForSuccess(
  chains: AppState['chains'],
  chainId: string,
  completedAt: Date,
): AppState['chains'] {
  return chains.map((chain) => {
    if (chain.id !== chainId) return chain;

    return {
      ...chain,
      currentStreak: chain.currentStreak + 1,
      totalCompletions: chain.totalCompletions + 1,
      lastCompletedAt: completedAt,
    };
  });
}

function updateChainsForFailure(
  chains: AppState['chains'],
  chainId: string,
): AppState['chains'] {
  return chains.map((chain) => {
    if (chain.id !== chainId) return chain;

    return {
      ...chain,
      currentStreak: 0,
      totalFailures: chain.totalFailures + 1,
    };
  });
}

interface GroupCycleIncrementResult {
  updatedChains: AppState['chains'];
  completedGroupId?: string;
}

function maybeIncrementGroupCycleCompletion(
  chains: AppState['chains'],
  completedChain: Chain,
  tr: (zh: string, en: string) => string,
  chainsRevision?: number,
): GroupCycleIncrementResult {
  if (!completedChain.parentId || completedChain.type === 'group')
    return { updatedChains: chains };

  const chainTree = queryOptimizer.memoizedBuildChainTree(
    chains,
    chainsRevision,
  );
  const groupNode = chainTree.find(
    (node) => node.id === completedChain.parentId,
  );
  if (!groupNode || groupNode.type !== 'group') {
    return { updatedChains: chains };
  }
  if (!isGroupFullyCompleted(groupNode)) {
    return { updatedChains: chains };
  }

  logger.debug(
    'SESSIONS',
    `任务群 ${groupNode.name} 已完成所有任务，增加完成计数`,
  );
  const updatedChains = incrementGroupCompletionCount(
    chains,
    completedChain.parentId,
  );

  const parentChain = updatedChains.find(
    (chain) => chain.id === completedChain.parentId,
  );
  if (parentChain) {
    void systemNotificationService.notifyTaskCompleted(
      parentChain.name,
      parentChain.currentStreak,
      tr('任务群完成一轮', 'Group completed a cycle'),
    );
  }

  return {
    updatedChains,
    completedGroupId: completedChain.parentId,
  };
}

async function persistCompletionHistoryAndCleanupSupabase(
  storage: MomentumStorage,
  record: CompletionHistory,
  setActiveSessionId: (sessionId: string | null) => void,
  context: 'completion' | 'interrupt',
): Promise<void> {
  try {
    await storage.appendCompletionHistory(record);
  } catch (error) {
    logger.error(
      'SESSIONS',
      `Failed to persist completion history after ${context}`,
      undefined,
      normalizeUnknownError(error),
    );
  } finally {
    setActiveSessionId(null);
    try {
      await storage.saveActiveSession(null);
    } catch (error) {
      logger.error(
        'SESSIONS',
        `Failed to clear active session after ${context}`,
        undefined,
        normalizeUnknownError(error),
      );
    } finally {
      emitPointsChanged();
    }
  }
}

interface CreateCompletionHandlersParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  activeSessionId: string | null;
  setActiveSessionId: (sessionId: string | null) => void;
  onNavigateToDashboard?: () => void;
  onPetTaskCompleted?: (duration: number, wasSuccessful: boolean) => void;
  onRsipTaskEvent?: (payload: RSIPTaskEventPayload) => void | Promise<void>;
  tr: (zh: string, en: string) => string;
}

export function createCompletionHandlers({
  state,
  setState,
  storage,
  safelySaveChains,
  activeSessionId,
  setActiveSessionId,
  onNavigateToDashboard,
  onPetTaskCompleted,
  onRsipTaskEvent,
  tr,
}: CreateCompletionHandlersParams) {
  function emitRsipTaskEvent(payload: RSIPTaskEventPayload): void {
    if (!onRsipTaskEvent) return;
    Promise.resolve(onRsipTaskEvent(payload)).catch((error) => {
      logger.warn(
        'SESSIONS',
        'RSIP integration event handler failed',
        { ...payload },
        normalizeUnknownError(error),
      );
    });
  }

  function persistChains(
    updatedChains: AppState['chains'],
    context: string,
  ): void {
    safelySaveChains(updatedChains).catch((error) => {
      queryOptimizer.onDataChange('chains');
      logger.error(
        'SESSIONS',
        context,
        undefined,
        normalizeUnknownError(error),
      );
    });
  }

  function persistCompletionHistoryAndCleanup(
    record: CompletionHistory,
    context: 'completion' | 'interrupt',
  ): void {
    if (activeSessionId && hasStorageCapability(storage, 'betting')) {
      persistCompletionHistoryAndCleanupSupabase(
        storage,
        record,
        setActiveSessionId,
        context,
      ).catch((error) => {
        logger.error(
          'SESSIONS',
          `Unexpected ${context} cleanup error`,
          undefined,
          normalizeUnknownError(error),
        );
      });
      return;
    }

    setActiveSessionId(null);

    storage.saveActiveSession(null).catch((error) => {
      logger.error(
        'SESSIONS',
        `Failed to clear active session after ${context}`,
        undefined,
        normalizeUnknownError(error),
      );
    });

    storage.appendCompletionHistory(record).catch((error) => {
      logger.error(
        'SESSIONS',
        `Failed to persist completion history after ${context}`,
        undefined,
        normalizeUnknownError(error),
      );
    });
  }

  const handleCompleteSession = (description?: string, notes?: string) => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const chain = state.chains.find(
      (item) => item.id === activeSession.chainId,
    );
    if (!chain) return;

    const actualDuration = computeActualDuration(activeSession, chain);

    const completedAt = new Date();
    const newStreak = chain.currentStreak + 1;
    void systemNotificationService.notifyTaskCompleted(chain.name, newStreak);

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt,
      duration: activeSession.duration,
      wasSuccessful: true,
      actualDuration,
      isForwardTimed: Boolean(chain.isDurationless),
      description,
      notes,
    };

    const updatedHistory = [...state.completionHistory, completionRecord];

    let updatedChains = updateChainsForSuccess(
      state.chains,
      chain.id,
      completedAt,
    );
    const groupCycleResult = maybeIncrementGroupCycleCompletion(
      updatedChains,
      chain,
      tr,
      state.chainsRevision + 1,
    );
    updatedChains = groupCycleResult.updatedChains;

    persistChains(updatedChains, '完成任务时保存链条数据失败');
    persistCompletionHistoryAndCleanup(completionRecord, 'completion');

    if (completionRecord.actualDuration) {
      storage
        .updateTaskTimeStats(chain.id, completionRecord.actualDuration)
        .catch((error) => {
          logger.error(
            'SESSIONS',
            'Failed to update task time stats after completion',
            { chainId: chain.id },
            normalizeUnknownError(error),
          );
        });
    }

    if (onPetTaskCompleted && actualDuration) {
      onPetTaskCompleted(actualDuration, true);
    }

    emitRsipTaskEvent({
      event: 'task_completed',
      chainId: chain.id,
      chainKind: chain.type === 'group' ? 'group' : 'unit',
      occurredAt: completedAt,
    });

    if (groupCycleResult.completedGroupId) {
      emitRsipTaskEvent({
        event: 'group_cycle_completed',
        chainId: groupCycleResult.completedGroupId,
        chainKind: 'group',
        occurredAt: completedAt,
      });
    }

    setState((prev) => ({
      ...prev,
      chains: updatedChains,
      chainsRevision: prev.chainsRevision + 1,
      activeSession: null,
      completionHistory: updatedHistory,
    }));
    onNavigateToDashboard?.();
  };

  const handleInterruptSession = (reason?: string) => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const chain = state.chains.find(
      (item) => item.id === activeSession.chainId,
    );
    if (!chain) return;

    if (chain.isDurationless) {
      const sessionId = `${activeSession.chainId}_${activeSession.startedAt.getTime()}`;
      forwardTimerManager.clearTimer(sessionId);
    }

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: activeSession.duration,
      wasSuccessful: false,
      reasonForFailure: reason || '用户主动中断',
      actualDuration: activeSession.duration,
      isForwardTimed: Boolean(chain.isDurationless),
    };

    const updatedHistory = [...state.completionHistory, completionRecord];

    let updatedChains = updateChainsForFailure(state.chains, chain.id);
    if (chain.parentId && chain.type !== 'group') {
      logger.debug(
        'SESSIONS',
        `任务 ${chain.name} 失败/中断，重置任务群完成计数`,
      );
      updatedChains = resetGroupCompletionCount(updatedChains, chain.parentId);
    }

    persistChains(updatedChains, '中断任务时保存链条数据失败');
    persistCompletionHistoryAndCleanup(completionRecord, 'interrupt');

    emitRsipTaskEvent({
      event: 'task_interrupted',
      chainId: chain.id,
      chainKind: chain.type === 'group' ? 'group' : 'unit',
      occurredAt: completionRecord.completedAt,
    });

    setState((prev) => ({
      ...prev,
      chains: updatedChains,
      chainsRevision: prev.chainsRevision + 1,
      activeSession: null,
      completionHistory: updatedHistory,
    }));
    onNavigateToDashboard?.();
  };

  return { handleCompleteSession, handleInterruptSession };
}
