import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { logger } from '../../../utils/logger';

interface CreatePauseResumeHandlersParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
}

export function createPauseResumeHandlers({ state, setState, storage }: CreatePauseResumeHandlersParams) {
  const handlePauseSession = () => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      isPaused: true,
      pausedAt: new Date(),
    };

    storage.saveActiveSession(updatedSession).catch(error => {
      logger.error('SESSIONS', 'Failed to persist paused session', undefined, error as Error);
    });

    setState(prev => ({
      ...prev,
      activeSession: updatedSession,
    }));
  };

  const handleResumeSession = () => {
    const activeSession = state.activeSession;
    if (!activeSession || !activeSession.pausedAt) return;

    const pauseDuration = Date.now() - activeSession.pausedAt.getTime();
    const updatedSession = {
      ...activeSession,
      isPaused: false,
      pausedAt: undefined,
      totalPausedTime: activeSession.totalPausedTime + pauseDuration,
    };

    storage.saveActiveSession(updatedSession).catch(error => {
      logger.error('SESSIONS', 'Failed to persist resumed session', undefined, error as Error);
    });

    setState(prev => ({
      ...prev,
      activeSession: updatedSession,
    }));
  };

  return { handlePauseSession, handleResumeSession };
}
