import { useState, useEffect, useRef } from 'react';
import { ScheduledSession } from '../../types';
import { getTimeRemaining } from '../../utils/time';
import { notificationManager } from '../../utils/notifications';
import { soundManager } from '../../utils/soundManager';
import { useI18n } from '../../i18n';

interface UseChainCardTimerOptions {
  scheduledSession?: ScheduledSession;
  chainName: string;
  auxiliaryDuration: number;
}

interface UseChainCardTimerResult {
  timeRemaining: number;
  isScheduled: boolean;
}

function getNotificationThreshold(durationMinutes: number): number | null {
  if (durationMinutes <= 3) return null;
  const thresholdMinutes = Math.floor(durationMinutes / 3);
  return Math.min(thresholdMinutes, 1) * 60;
}

export function useChainCardTimer({
  scheduledSession,
  chainName,
  auxiliaryDuration,
}: UseChainCardTimerOptions): UseChainCardTimerResult {
  const { tr } = useI18n();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const lastPlayedExpiresAtRef = useRef<number | null>(null);

  useEffect(() => {
    setHasShownWarning(false);
  }, [scheduledSession?.scheduledAt, scheduledSession?.chainId]);

  useEffect(() => {
    if (!scheduledSession) {
      lastPlayedExpiresAtRef.current = null;
      return;
    }

    const notificationThreshold = getNotificationThreshold(auxiliaryDuration);

    const updateTimer = () => {
      const remaining = getTimeRemaining(scheduledSession.expiresAt);
      setTimeRemaining(remaining);

      if (
        notificationThreshold &&
        remaining <= notificationThreshold &&
        remaining > 0 &&
        !hasShownWarning
      ) {
        setHasShownWarning(true);
        const minutes = Math.max(1, Math.ceil(remaining / 60));
        notificationManager.notifyScheduleWarning(
          chainName,
          tr(`${minutes}分钟`, `${minutes} min`)
        );
      }

      if (remaining <= 0) {
        notificationManager.notifyScheduleFailed(chainName);

        if (lastPlayedExpiresAtRef.current !== scheduledSession.expiresAt.getTime()) {
          soundManager.playTimerFinished();
          lastPlayedExpiresAtRef.current = scheduledSession.expiresAt.getTime();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledSession, hasShownWarning, chainName, auxiliaryDuration, tr]);

  const isScheduled = Boolean(scheduledSession && timeRemaining > 0);

  return { timeRemaining, isScheduled };
}
