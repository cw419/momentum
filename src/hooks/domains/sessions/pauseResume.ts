import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { resolveAppStateReader } from '../appStateAccess';
import { logger } from '../../../utils/logger';
import { normalizeUnknownError } from '../../../utils/errors/normalizeError';

interface CreatePauseResumeHandlersParams {
  state?: AppState;
  getState?: () => AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
}

export function createPauseResumeHandlers({
  state,
  getState,
  setState,
  storage,
}: CreatePauseResumeHandlersParams) {
  const readState = resolveAppStateReader({ state, getState });
  const handlePauseSession = () => {
    const activeSession = readState().activeSession;
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      isPaused: true,
      pausedAt: new Date(),
    };

    storage.saveActiveSession(updatedSession).catch((error) => {
      logger.error(
        'SESSIONS',
        'Failed to persist paused session',
        undefined,
        normalizeUnknownError(error),
      );
    });

    setState((prev) => ({
      ...prev,
      activeSession: updatedSession,
    }));
  };

  const handleResumeSession = () => {
    const activeSession = readState().activeSession;
    if (!activeSession || !activeSession.pausedAt) return;

    const pauseDuration = Date.now() - activeSession.pausedAt.getTime();
    const updatedSession = {
      ...activeSession,
      isPaused: false,
      pausedAt: undefined,
      totalPausedTime: activeSession.totalPausedTime + pauseDuration,
    };

    storage.saveActiveSession(updatedSession).catch((error) => {
      logger.error(
        'SESSIONS',
        'Failed to persist resumed session',
        undefined,
        normalizeUnknownError(error),
      );
    });

    setState((prev) => ({
      ...prev,
      activeSession: updatedSession,
    }));
  };

  return { handlePauseSession, handleResumeSession };
}
