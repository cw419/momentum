import type { Dispatch, SetStateAction } from 'react';
import type { AppState, CompletionHistory } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import type { SafelySaveChains } from '../useChainsDomain';
import { incrementGroupCompletionCount, isGroupFullyCompleted, resetGroupCompletionCount } from '../../../utils/chainTree';
import { forwardTimerManager } from '../../../utils/forwardTimer';
import { logger } from '../../../utils/logger';
import { notificationManager } from '../../../utils/notifications';
import { emitPointsChanged } from '../../../utils/pointsEvents';
import { queryOptimizer } from '../../../utils/queryOptimizer';

type Chain = AppState['chains'][number];
type ActiveSession = NonNullable<AppState['activeSession']>;

function computeActualDuration(activeSession: ActiveSession, chain: Chain): number {
  if (!chain.isDurationless) return activeSession.duration;

  const sessionId = `${activeSession.chainId}_${activeSession.startedAt.getTime()}`;
  const elapsedSeconds = forwardTimerManager.stopTimer(sessionId);
  return Math.ceil(elapsedSeconds / 60);
}

function updateChainsForSuccess(chains: AppState['chains'], chainId: string, completedAt: Date): AppState['chains'] {
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

function updateChainsForFailure(chains: AppState['chains'], chainId: string): AppState['chains'] {
  return chains.map((chain) => {
    if (chain.id !== chainId) return chain;

    return {
      ...chain,
      currentStreak: 0,
      totalFailures: chain.totalFailures + 1,
    };
  });
}

function maybeIncrementGroupCycleCompletion(
  chains: AppState['chains'],
  completedChain: Chain,
  tr: (zh: string, en: string) => string
): AppState['chains'] {
  if (!completedChain.parentId || completedChain.type === 'group') return chains;

  const chainTree = queryOptimizer.memoizedBuildChainTree(chains);
  const groupNode = chainTree.find((node) => node.id === completedChain.parentId);
  if (!groupNode || groupNode.type !== 'group') return chains;
  if (!isGroupFullyCompleted(groupNode)) return chains;

  logger.debug('SESSIONS', `任务群 ${groupNode.name} 已完成所有任务，增加完成计数`);
  const updatedChains = incrementGroupCompletionCount(chains, completedChain.parentId);

  const parentChain = updatedChains.find((chain) => chain.id === completedChain.parentId);
  if (parentChain) {
    notificationManager.notifyTaskCompleted(
      parentChain.name,
      parentChain.currentStreak,
      tr('任务群完成一轮', 'Group completed a cycle')
    );
  }

  return updatedChains;
}

async function persistCompletionHistoryAndCleanupSupabase(
  storage: MomentumStorage,
  historyToPersist: CompletionHistory[],
  setActiveSessionId: Dispatch<SetStateAction<string | null>>,
  context: 'completion' | 'interrupt'
): Promise<void> {
  try {
    await storage.saveCompletionHistory(historyToPersist);
  } catch (error) {
    logger.error(
      'SESSIONS',
      `Failed to persist completion history after ${context}`,
      undefined,
      error as Error
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
        error as Error
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
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  onPetTaskCompleted?: (duration: number, wasSuccessful: boolean) => void;
  tr: (zh: string, en: string) => string;
}

export function createCompletionHandlers({
  state,
  setState,
  storage,
  safelySaveChains,
  activeSessionId,
  setActiveSessionId,
  onPetTaskCompleted,
  tr,
}: CreateCompletionHandlersParams) {
  function persistChains(updatedChains: AppState['chains'], context: string): void {
    safelySaveChains(updatedChains).catch((error) => {
      queryOptimizer.onDataChange('chains');
      logger.error('SESSIONS', context, undefined, error as Error);
    });
  }

  function persistCompletionHistoryAndCleanup(
    historyToPersist: CompletionHistory[],
    context: 'completion' | 'interrupt'
  ): void {
    if (activeSessionId && storage.kind === 'supabase') {
      persistCompletionHistoryAndCleanupSupabase(storage, historyToPersist, setActiveSessionId, context).catch(
        (error) => {
          logger.error('SESSIONS', `Unexpected ${context} cleanup error`, undefined, error as Error);
        }
      );
      return;
    }

    setActiveSessionId(null);

    storage.saveActiveSession(null).catch((error) => {
      logger.error(
        'SESSIONS',
        `Failed to clear active session after ${context}`,
        undefined,
        error as Error
      );
    });

    storage.saveCompletionHistory(historyToPersist).catch((error) => {
      logger.error(
        'SESSIONS',
        `Failed to persist completion history after ${context}`,
        undefined,
        error as Error
      );
    });
  }

  const handleCompleteSession = (description?: string, notes?: string) => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const chain = state.chains.find((item) => item.id === activeSession.chainId);
    if (!chain) return;

    const actualDuration = computeActualDuration(activeSession, chain);

    const completedAt = new Date();
    const newStreak = chain.currentStreak + 1;
    notificationManager.notifyTaskCompleted(chain.name, newStreak);

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
    const historyToPersist = storage.kind === 'supabase' ? [completionRecord] : updatedHistory;

    let updatedChains = updateChainsForSuccess(state.chains, chain.id, completedAt);
    updatedChains = maybeIncrementGroupCycleCompletion(updatedChains, chain, tr);

    persistChains(updatedChains, '完成任务时保存链条数据失败');
    persistCompletionHistoryAndCleanup(historyToPersist, 'completion');

    if (completionRecord.actualDuration) {
      storage.updateTaskTimeStats(chain.id, completionRecord.actualDuration).catch((error) => {
        logger.error(
          'SESSIONS',
          'Failed to update task time stats after completion',
          { chainId: chain.id },
          error as Error
        );
      });
    }

    if (onPetTaskCompleted && actualDuration) {
      onPetTaskCompleted(actualDuration, true);
    }

    setState((prev) => ({
      ...prev,
      chains: updatedChains,
      activeSession: null,
      completionHistory: updatedHistory,
      currentView: 'dashboard',
    }));
  };

  const handleInterruptSession = (reason?: string) => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const chain = state.chains.find((item) => item.id === activeSession.chainId);
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
    const historyToPersist = storage.kind === 'supabase' ? [completionRecord] : updatedHistory;

    let updatedChains = updateChainsForFailure(state.chains, chain.id);
    if (chain.parentId && chain.type !== 'group') {
      logger.debug('SESSIONS', `任务 ${chain.name} 失败/中断，重置任务群完成计数`);
      updatedChains = resetGroupCompletionCount(updatedChains, chain.parentId);
    }

    persistChains(updatedChains, '中断任务时保存链条数据失败');
    persistCompletionHistoryAndCleanup(historyToPersist, 'interrupt');

    setState((prev) => ({
      ...prev,
      chains: updatedChains,
      activeSession: null,
      completionHistory: updatedHistory,
      currentView: 'dashboard',
    }));
  };

  return { handleCompleteSession, handleInterruptSession };
}

