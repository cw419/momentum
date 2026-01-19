import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';
import { isSessionExpired } from '../../utils/time';
import { notificationManager } from '../../utils/notifications';
import { isGroupExpired, resetGroupProgress } from '../../utils/timeLimit';
import { soundManager } from '../../utils/soundManager';

interface UsePeriodicCleanupParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  isInitialized: boolean;
  setShowAuxiliaryJudgment: (chainId: string | null) => void;
}

/**
 * Handles periodic cleanup tasks:
 * - Expired task group reset
 * - Expired scheduled session cleanup with notifications
 */
export function usePeriodicCleanup({
  state,
  setState,
  storage,
  isInitialized,
  setShowAuxiliaryJudgment,
}: UsePeriodicCleanupParams): void {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!isInitialized) return;

    const checkExpiredGroups = () => {
      const current = stateRef.current;
      let hasChanges = false;

      const updatedChains = current.chains.map((chain) => {
        if (chain.type === 'group' && isGroupExpired(chain)) {
          hasChanges = true;
          return resetGroupProgress(chain);
        }
        return chain;
      });

      if (!hasChanges) return;

      void storage.saveChains(updatedChains).catch((error) => {
        logger.error(
          'PERIODIC_CLEANUP',
          'Failed to persist group expiry cleanup',
          undefined,
          toError(error)
        );
      });

      setState((prev) => ({ ...prev, chains: updatedChains }));
    };

    const interval = setInterval(checkExpiredGroups, 60000);
    return () => clearInterval(interval);
  }, [storage, isInitialized, setState]);

  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      const current = stateRef.current;

      const expiredSessions = current.scheduledSessions.filter((session) =>
        isSessionExpired(session.expiresAt)
      );
      if (expiredSessions.length === 0) return;

      const activeScheduledSessions = current.scheduledSessions.filter(
        (session) => !isSessionExpired(session.expiresAt)
      );

      soundManager.playTimerFinished();

      expiredSessions.forEach((session) => {
        const chain = current.chains.find((c) => c.id === session.chainId);
        if (chain) {
          notificationManager.notifyScheduleFailed(chain.name);
        }
      });

      setShowAuxiliaryJudgment(expiredSessions[0].chainId);

      void storage.saveScheduledSessions(activeScheduledSessions).catch((error) => {
        logger.error(
          'PERIODIC_CLEANUP',
          'Failed to persist scheduled session cleanup',
          undefined,
          toError(error)
        );
      });

      setState((prev) => ({ ...prev, scheduledSessions: activeScheduledSessions }));
    }, 10000);

    return () => clearInterval(interval);
  }, [storage, isInitialized, setState, setShowAuxiliaryJudgment]);
}
