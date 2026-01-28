import type { Dispatch, SetStateAction } from 'react';
import type { ActiveSession, AppState } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import type { SafelySaveChains } from '../useChainsDomain';
import { getNextUnitInGroup, incrementGroupCompletionCount } from '../../../utils/chainTree';
import { logger } from '../../../utils/logger';
import { notificationManager } from '../../../utils/notifications';
import { queryOptimizer } from '../../../utils/queryOptimizer';
import { isGroupExpired, resetGroupProgress, startGroupTimer } from '../../../utils/timeLimit';
import { toast } from '../../../utils/toast';

type Chain = AppState['chains'][number];
type ScheduledSession = AppState['scheduledSessions'][number];

interface CreateStartChainHandlerParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  pendingChainId: string | null;
  setPendingChainId: Dispatch<SetStateAction<string | null>>;
  currentSessionId: string | null;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;
  setShowBettingModal: Dispatch<SetStateAction<boolean>>;
  tr: (zh: string, en: string) => string;
}

function buildActiveSession(params: {
  chainId: string;
  chain: Chain;
  bettingSessionId: string | null;
}): ActiveSession {
  return {
    ...(params.bettingSessionId ? { id: params.bettingSessionId } : {}),
    chainId: params.chainId,
    startedAt: new Date(),
    duration: params.chain.isDurationless ? 0 : params.chain.duration,
    isPaused: false,
    totalPausedTime: 0,
  };
}

export function createStartChainHandler({
  state,
  setState,
  storage,
  safelySaveChains,
  pendingChainId,
  setPendingChainId,
  currentSessionId,
  setCurrentSessionId,
  setShowBettingModal,
  tr,
}: CreateStartChainHandlerParams) {
  function findChain(chainId: string): Chain | null {
    return state.chains.find((chain) => chain.id === chainId) ?? null;
  }

  function findScheduledSession(chainId: string): ScheduledSession | null {
    return state.scheduledSessions.find((session) => session.chainId === chainId) ?? null;
  }

  function persistScheduledSessions(chainId: string, scheduledSessions: AppState['scheduledSessions']): void {
    storage.saveScheduledSessions(scheduledSessions).catch((error) => {
      logger.error('SESSIONS', 'Failed to persist scheduled sessions', { chainId }, error as Error);
    });
  }

  function persistActiveSession(chainId: string, session: ActiveSession): void {
    storage.saveActiveSession(session).catch((error) => {
      logger.error('SESSIONS', 'Failed to persist active session', { chainId }, error as Error);
      toast.error(
        tr(
          '无法保存任务会话：数据库可能处于只读状态或写入被拒绝（查看控制台）',
          'Failed to persist session: database may be read-only or write is denied (check console).'
        )
      );
    });
  }

  function persistChains(chainId: string, chains: AppState['chains']): void {
    safelySaveChains(chains).catch((error) => {
      queryOptimizer.onDataChange('chains');
      logger.error('SESSIONS', '开始任务时保存链条数据失败', { chainId }, error as Error);
    });
  }

  async function maybeStartBettingSession(chainId: string): Promise<boolean> {
    if (storage.kind !== 'supabase') return false;
    if (pendingChainId) return false;

    try {
      const isGamblingEnabled = await storage.isGamblingModeEnabled();
      if (!isGamblingEnabled.ok || !isGamblingEnabled.value) return false;

      const chain = findChain(chainId);
      if (!chain) return true;

      const sessionId = await storage.createBettingSession(chainId, chain.duration);
      if (!sessionId.ok) {
        logger.error('SESSIONS', 'Failed to create betting session', {
          chainId,
          code: sessionId.error.code,
          message: sessionId.error.message,
        });
        toast.error(
          tr(
            '无法创建押注会话：数据库可能处于只读状态（查看控制台）',
            'Failed to create betting session: database may be read-only (check console).'
          )
        );
        return true;
      }

      setPendingChainId(chainId);
      setCurrentSessionId(sessionId.value);
      setShowBettingModal(true);
      return true;
    } catch (error) {
      logger.error('SESSIONS', 'Failed to check gambling mode', undefined, error as Error);
      return false;
    }
  }

  function resetExpiredGroup(groupId: string, groupName: string): void {
    const updatedChains = state.chains.map((chain) => (chain.id === groupId ? resetGroupProgress(chain) : chain));

    setState((prev) => ({
      ...prev,
      chains: updatedChains,
    }));

    notificationManager.notifyTaskFailed(groupName, tr('任务群已超时', 'Group has expired'));
  }

  function startGroupTimerIfNeeded(groupId: string): void {
    const updatedChains = state.chains.map((chain) => (chain.id === groupId ? startGroupTimer(chain) : chain));
    setState((prev) => ({
      ...prev,
      chains: updatedChains,
    }));
  }

  function scheduleStartFirstUnitInNextCycle(params: {
    groupId: string;
    groupName: string;
    nextCycleNumber: number;
  }): void {
    setTimeout(() => {
      storage
        .getActiveChains()
        .then((freshChains) => {
          const newTree = queryOptimizer.memoizedBuildChainTree(freshChains);
          let newGroupNode: (typeof newTree)[number] | null = null;
          for (const node of newTree) {
            if (node.id === params.groupId) {
              newGroupNode = node;
              break;
            }
          }
          const firstUnit = newGroupNode ? getNextUnitInGroup(newGroupNode) : null;
          if (!firstUnit) return;

          logger.debug(
            'SESSIONS',
            `任务群 ${params.groupName} 开始新一轮（第${params.nextCycleNumber}轮），从 ${firstUnit.name} 开始`
          );

          return handleStartChain(firstUnit.id);
        })
        .catch((error) => {
          logger.error('SESSIONS', 'Failed to start next cycle first unit', { chainId: params.groupId }, error as Error);
        });
    }, 100);
  }

  async function completeGroupCycle(groupId: string, groupName: string): Promise<void> {
    logger.debug('SESSIONS', `任务群 ${groupName} 所有子任务已完成，开始新一轮循环`);

    const updatedChains = incrementGroupCompletionCount(state.chains, groupId);
    const updatedGroup = updatedChains.find((chain) => chain.id === groupId);

    if (updatedGroup) {
      notificationManager.notifyTaskCompleted(
        updatedGroup.name,
        updatedGroup.totalCompletions,
        tr(
          `第${updatedGroup.totalCompletions}轮已完成，正在开始第${updatedGroup.totalCompletions + 1}轮`,
          `Cycle ${updatedGroup.totalCompletions} completed. Starting cycle ${updatedGroup.totalCompletions + 1}.`
        )
      );
    }

    try {
      await safelySaveChains(updatedChains);
      queryOptimizer.onDataChange('chains');
      setState((prev) => ({ ...prev, chains: updatedChains }));

      scheduleStartFirstUnitInNextCycle({
        groupId,
        groupName,
        nextCycleNumber: (updatedGroup?.totalCompletions ?? 0) + 1,
      });
    } catch (error) {
      logger.error('SESSIONS', '保存任务群完成计数失败', undefined, error as Error);
    }
  }

  async function startGroupChain(groupChain: Chain): Promise<void> {
    if (isGroupExpired(groupChain)) {
      resetExpiredGroup(groupChain.id, groupChain.name);
      return;
    }

    if (groupChain.timeLimitHours && !groupChain.groupStartedAt) {
      startGroupTimerIfNeeded(groupChain.id);
    }

    const chainTree = queryOptimizer.memoizedBuildChainTree(state.chains);
    const groupNode = chainTree.find((node) => node.id === groupChain.id);
    if (!groupNode) {
      logger.error('SESSIONS', '无法找到任务群节点', { chainId: groupChain.id });
      return;
    }

    const nextUnit = getNextUnitInGroup(groupNode);
    if (nextUnit) {
      logger.debug('SESSIONS', `任务群 ${groupChain.name} 开始下一个任务: ${nextUnit.name}`);
      await handleStartChain(nextUnit.id);
      return;
    }

    await completeGroupCycle(groupChain.id, groupChain.name);
  }

  function startSingleChain(chain: Chain): void {
    const existingScheduledSession = findScheduledSession(chain.id);
    const bettingSessionId = pendingChainId === chain.id ? currentSessionId : null;

    const activeSession = buildActiveSession({ chainId: chain.id, chain, bettingSessionId });
    const updatedScheduledSessions = state.scheduledSessions.filter((session) => session.chainId !== chain.id);

    const updatedChains = existingScheduledSession
      ? state.chains.map((item) =>
          item.id === chain.id ? { ...item, auxiliaryStreak: item.auxiliaryStreak + 1 } : item
        )
      : state.chains;

    if (existingScheduledSession) {
      notificationManager.notifyTaskCompleted(
        chain.name,
        chain.auxiliaryStreak + 1,
        tr('预约已完成', 'Schedule completed')
      );
    }

    persistActiveSession(chain.id, activeSession);
    persistScheduledSessions(chain.id, updatedScheduledSessions);
    if (existingScheduledSession) {
      persistChains(chain.id, updatedChains);
    }

    setState((prev) => ({
      ...prev,
      activeSession,
      scheduledSessions: updatedScheduledSessions,
      chains: updatedChains,
      currentView: 'focus',
    }));
  }

  async function handleStartChain(chainId: string): Promise<void> {
    if (await maybeStartBettingSession(chainId)) return;

    const chain = findChain(chainId);
    if (!chain) return;

    if (chain.type === 'group') {
      await startGroupChain(chain);
      return;
    }

    startSingleChain(chain);
  }

  return handleStartChain;
}
