import { useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { resolveAppStateReader } from '../../hooks/domains/appStateAccess';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';
import { isSessionExpired } from '../../utils/time';
import { systemNotificationService } from '../../services/platform/SystemNotificationService';
import { isGroupExpired, resetGroupProgress } from '../../utils/timeLimit';
import { soundManager } from '../../utils/soundManager';
import { appShellStore } from '../../stores/appShellStore';

interface UsePeriodicCleanupParams {
  state?: AppState;
  getState?: () => AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  isInitialized: boolean;
}

/**
 * Handles periodic cleanup tasks:
 * - Expired task group reset
 * - Expired scheduled session cleanup with notifications
 */
export function usePeriodicCleanup({
  state,
  getState,
  setState,
  storage,
  isInitialized,
}: UsePeriodicCleanupParams): void {
  const readState = useMemo(
    () => resolveAppStateReader({ state, getState }),
    [getState, state],
  );
  const stateRef = useRef<AppState>(readState());
  useEffect(() => {
    stateRef.current = readState();
  }, [readState]);

  useEffect(() => {
    if (!isInitialized) return;

    const checkExpiredGroups = () => {
      const current = stateRef.current;
      let hasChanges = false;
      const resetChains: AppState['chains'] = [];

      const updatedChains = current.chains.map((chain) => {
        if (chain.type === 'group' && isGroupExpired(chain)) {
          hasChanges = true;
          const resetChain = resetGroupProgress(chain);
          resetChains.push(resetChain);
          return resetChain;
        }
        return chain;
      });

      if (!hasChanges) return;

      Promise.all(resetChains.map((chain) => storage.upsertChain(chain))).catch(
        (error) => {
          logger.error(
            'PERIODIC_CLEANUP',
            'Failed to persist group expiry cleanup',
            undefined,
            toError(error),
          );
        },
      );

      setState((prev) => ({
        ...prev,
        chains: updatedChains,
        chainsRevision: prev.chainsRevision + 1,
      }));
    };

    const interval = setInterval(checkExpiredGroups, 60000);
    return () => clearInterval(interval);
  }, [storage, isInitialized, setState]);

  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      const current = stateRef.current;

      const expiredSessions = current.scheduledSessions.filter((session) =>
        isSessionExpired(session.expiresAt),
      );
      if (expiredSessions.length === 0) return;

      const activeScheduledSessions = current.scheduledSessions.filter(
        (session) => !isSessionExpired(session.expiresAt),
      );

      soundManager.playTimerFinished();

      for (const session of expiredSessions) {
        const chain = current.chains.find((c) => c.id === session.chainId);
        if (chain) {
          void systemNotificationService.notifyScheduleFailed(chain.name);
        }
      }

      appShellStore
        .getState()
        .setShowAuxiliaryJudgment(expiredSessions[0].chainId);

      Promise.all(
        expiredSessions.map((session) =>
          storage.removeScheduledSession(session.chainId),
        ),
      ).catch((error) => {
        logger.error(
          'PERIODIC_CLEANUP',
          'Failed to persist scheduled session cleanup',
          undefined,
          toError(error),
        );
      });

      setState((prev) => ({
        ...prev,
        scheduledSessions: activeScheduledSessions,
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, [storage, isInitialized, setState]);
}
