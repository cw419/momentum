import type { Dispatch, SetStateAction } from 'react';
import type { AppState, ScheduledSession } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import type { SafelySaveChains } from '../useChainsDomain';
import { queryOptimizer } from '../../../utils/queryOptimizer';
import { systemNotificationService } from '../../../services/platform/SystemNotificationService';
import { logger } from '../../../utils/logger';
import { toast } from '../../../utils/toast';
import { normalizeUnknownError } from '../../../utils/errors/normalizeError';

interface CreateSchedulingHandlersParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  setShowAuxiliaryJudgment: Dispatch<SetStateAction<string | null>>;
  tr: (zh: string, en: string) => string;
}

export function createSchedulingHandlers({
  state,
  setState,
  storage,
  safelySaveChains,
  setShowAuxiliaryJudgment,
  tr,
}: CreateSchedulingHandlersParams) {
  const handleScheduleChain = (chainId: string) => {
    const existingSchedule = state.scheduledSessions.find(
      (s) => s.chainId === chainId,
    );
    if (existingSchedule) return;

    const chain = state.chains.find((c) => c.id === chainId);
    if (!chain) return;

    const scheduledSession: ScheduledSession = {
      chainId,
      scheduledAt: new Date(),
      expiresAt: new Date(Date.now() + chain.auxiliaryDuration * 60 * 1000),
      auxiliarySignal: chain.auxiliarySignal,
    };

    const updateStateAndSave = async () => {
      try {
        const updatedSessions = [...state.scheduledSessions, scheduledSession];

        const updatedChains = state.chains.map((chain) =>
          chain.id === chainId
            ? { ...chain, auxiliaryStreak: chain.auxiliaryStreak + 1 }
            : chain,
        );

        await Promise.all([
          storage.saveScheduledSessions(updatedSessions),
          safelySaveChains(updatedChains),
        ]);
        queryOptimizer.onDataChange('chains');

        setState((prev) => ({
          ...prev,
          scheduledSessions: updatedSessions,
          chains: updatedChains,
          chainsRevision: prev.chainsRevision + 1,
        }));
      } catch (error) {
        logger.error(
          'SESSIONS',
          'Failed to schedule chain',
          { chainId },
          normalizeUnknownError(error),
        );
        toast.error(
          tr('预约失败，请重试', 'Failed to schedule. Please try again.'),
        );
      }
    };

    updateStateAndSave();
  };

  const handleCancelScheduledSession = (chainId: string) => {
    setShowAuxiliaryJudgment(chainId);
  };

  const handleCompleteBooking = (chainId: string) => {
    const chain = state.chains.find((c) => c.id === chainId);
    if (!chain) return;

    const updatedScheduledSessions = state.scheduledSessions.filter(
      (session) => session.chainId !== chainId,
    );
    const updatedChains = state.chains.map((c) =>
      c.id === chainId ? { ...c, auxiliaryStreak: c.auxiliaryStreak + 1 } : c,
    );

    storage.saveScheduledSessions(updatedScheduledSessions).catch((error) => {
      logger.error(
        'SESSIONS',
        'Failed to persist scheduled sessions after completing booking',
        { chainId },
        normalizeUnknownError(error),
      );
    });
    safelySaveChains(updatedChains).catch((error) => {
      queryOptimizer.onDataChange('chains');
      logger.error(
        'SESSIONS',
        '完成预约时保存链条数据失败',
        undefined,
        normalizeUnknownError(error),
      );
    });

    setState((prev) => ({
      ...prev,
      scheduledSessions: updatedScheduledSessions,
      chains: updatedChains,
      chainsRevision: prev.chainsRevision + 1,
    }));

    void systemNotificationService.notifyTaskCompleted(
      chain.name,
      chain.auxiliaryStreak + 1,
      tr('预约已完成', 'Schedule completed'),
    );
  };

  return {
    handleScheduleChain,
    handleCancelScheduledSession,
    handleCompleteBooking,
  };
}



