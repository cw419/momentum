import { useEffect, useRef } from 'react';
import type { ActiveSession } from '../../../types';

export const AUTO_COMPLETION_GRACE_MINUTES = 30;
const MAX_TIMEOUT_MS = 2_147_483_647;

export function getAutoCompletionAt(session: ActiveSession): Date {
  const activeLimitMs =
    (session.duration + AUTO_COMPLETION_GRACE_MINUTES) * 60 * 1000;
  return new Date(
    session.startedAt.getTime() + session.totalPausedTime + activeLimitMs,
  );
}

interface UseSessionAutoCompletionParams {
  session: ActiveSession | null;
  isDurationless: boolean;
  onAutoComplete: (completedAt: Date, actualDuration: number) => void;
}

export function useSessionAutoCompletion({
  session,
  isDurationless,
  onAutoComplete,
}: UseSessionAutoCompletionParams): void {
  const onAutoCompleteRef = useRef(onAutoComplete);
  onAutoCompleteRef.current = onAutoComplete;

  useEffect(() => {
    if (!session || session.isPaused || isDurationless) return undefined;

    const completedAt = getAutoCompletionAt(session);
    const actualDuration = session.duration + AUTO_COMPLETION_GRACE_MINUTES;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const remainingMs = completedAt.getTime() - Date.now();
      if (remainingMs <= 0) {
        onAutoCompleteRef.current(completedAt, actualDuration);
        return;
      }
      timeout = setTimeout(schedule, Math.min(remainingMs, MAX_TIMEOUT_MS));
    };

    schedule();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isDurationless, session]);
}
