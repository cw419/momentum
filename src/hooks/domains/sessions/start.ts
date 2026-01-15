import type { Dispatch, SetStateAction } from 'react';
import type { ActiveSession, AppState } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import type { SafelySaveChains } from '../useChainsDomain';
import { isGroupExpired, resetGroupProgress, startGroupTimer } from '../../../utils/timeLimit';
import { queryOptimizer } from '../../../utils/queryOptimizer';
import { getNextUnitInGroup, incrementGroupCompletionCount } from '../../../utils/chainTree';
import { notificationManager } from '../../../utils/notifications';
import { logger } from '../../../utils/logger';
import { toast } from '../../../utils/toast';

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
  const handleStartChain = async (chainId: string) => {
    if (storage.kind === 'supabase' && !pendingChainId) {
      try {
        const isGamblingEnabled = await storage.isGamblingModeEnabled();
        if (isGamblingEnabled.ok && isGamblingEnabled.value) {
          const chain = state.chains.find(c => c.id === chainId);
          if (!chain) return;

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
            return;
          }

          setPendingChainId(chainId);
          setCurrentSessionId(sessionId.value);
          setShowBettingModal(true);
          return;
        }
      } catch (error) {
        logger.error('SESSIONS', 'Failed to check gambling mode', undefined, error as Error);
      }
    }

    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const existingScheduledSession = state.scheduledSessions.find(session => session.chainId === chainId);

    if (chain.type === 'group') {
      if (isGroupExpired(chain)) {
        const updatedChains = state.chains.map(c => (c.id === chainId ? resetGroupProgress(c) : c));

        setState(prev => ({
          ...prev,
          chains: updatedChains,
        }));

        notificationManager.notifyTaskFailed(chain.name, tr('任务群已超时', 'Group has expired'));
        return;
      }

      if (chain.timeLimitHours && !chain.groupStartedAt) {
        const updatedChains = state.chains.map(c => (c.id === chainId ? startGroupTimer(c) : c));

        setState(prev => ({
          ...prev,
          chains: updatedChains,
        }));
      }

      const chainTree = queryOptimizer.memoizedBuildChainTree(state.chains);
      const groupNode = chainTree.find(node => node.id === chainId);
      if (groupNode) {
        const nextUnit = getNextUnitInGroup(groupNode);
        if (nextUnit) {
          logger.debug('SESSIONS', `任务群 ${chain.name} 开始下一个任务: ${nextUnit.name}`);
          await handleStartChain(nextUnit.id);
          return;
        }

        logger.debug('SESSIONS', `任务群 ${chain.name} 所有子任务已完成，开始新一轮循环`);

        const updatedChains = incrementGroupCompletionCount(state.chains, chainId);
        const updatedGroup = updatedChains.find(c => c.id === chainId);

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
          setState(prev => ({ ...prev, chains: updatedChains }));

          setTimeout(async () => {
            const freshChains = await storage.getActiveChains();
            const newTree = queryOptimizer.memoizedBuildChainTree(freshChains);
            const newGroupNode = newTree.find(n => n.id === chainId);

            const firstUnit = newGroupNode ? getNextUnitInGroup(newGroupNode) : null;
            if (firstUnit) {
              logger.debug(
                'SESSIONS',
                `任务群 ${chain.name} 开始新一轮（第${(updatedGroup?.totalCompletions ?? 0) + 1}轮），从 ${firstUnit.name} 开始`
              );
              await handleStartChain(firstUnit.id);
            }
          }, 100);
        } catch (e) {
          logger.error('SESSIONS', '保存任务群完成计数失败', undefined, e as Error);
        }

        return;
      }

      logger.error('SESSIONS', '无法找到任务群节点', { chainId });
      return;
    }

    const bettingSessionId = pendingChainId === chainId ? currentSessionId : null;

    const activeSession: ActiveSession = {
      ...(bettingSessionId ? { id: bettingSessionId } : {}),
      chainId,
      startedAt: new Date(),
      duration: chain.isDurationless ? 0 : chain.duration,
      isPaused: false,
      totalPausedTime: 0,
    };

    const updatedScheduledSessions = state.scheduledSessions.filter(session => session.chainId !== chainId);

    let updatedChains = state.chains;
    if (existingScheduledSession) {
      updatedChains = state.chains.map(c => (c.id === chainId ? { ...c, auxiliaryStreak: c.auxiliaryStreak + 1 } : c));

      notificationManager.notifyTaskCompleted(chain.name, chain.auxiliaryStreak + 1, tr('预约已完成', 'Schedule completed'));
    }

    void storage.saveActiveSession(activeSession).catch(error => {
      logger.error('SESSIONS', 'Failed to persist active session', { chainId }, error as Error);
      toast.error(
        tr(
          '无法保存任务会话：数据库可能处于只读状态或写入被拒绝（查看控制台）',
          'Failed to persist session: database may be read-only or write is denied (check console).'
        )
      );
    });
    void storage.saveScheduledSessions(updatedScheduledSessions).catch(error => {
      logger.error('SESSIONS', 'Failed to persist scheduled sessions', { chainId }, error as Error);
    });

    if (existingScheduledSession) {
      safelySaveChains(updatedChains).catch(error => {
        queryOptimizer.onDataChange('chains');
        logger.error('SESSIONS', '开始任务时保存链条数据失败', undefined, error as Error);
      });
    }

    setState(prev => ({
      ...prev,
      activeSession,
      scheduledSessions: updatedScheduledSessions,
      chains: updatedChains,
      currentView: 'focus',
    }));
  };

  return handleStartChain;
}

