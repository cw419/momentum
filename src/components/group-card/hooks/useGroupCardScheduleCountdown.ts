import { useEffect, useState } from 'react';
import type { ChainTreeNode, ScheduledSession } from '../../../types';
import { getTimeRemaining } from '../../../utils/time';
import { notificationManager } from '../../../utils/notifications';

function getNotificationThreshold(durationMinutes: number) {
  if (durationMinutes <= 3) return null;
  const thresholdMinutes = Math.floor(durationMinutes / 3);
  return Math.min(thresholdMinutes, 1) * 60;
}

export function useGroupCardScheduleCountdown(params: {
  scheduledSession?: ScheduledSession;
  group: ChainTreeNode;
  nextUnit: ChainTreeNode | null;
  tr: (zh: string, en: string) => string;
}) {
  const { scheduledSession, group, nextUnit, tr } = params;

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  useEffect(() => {
    if (!scheduledSession) return;

    const durationForWarning = nextUnit
      ? nextUnit.auxiliaryDuration
      : group.auxiliaryDuration;
    const notificationThreshold = getNotificationThreshold(durationForWarning);

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
          group.name,
          tr(`${minutes}分钟`, `${minutes} min`),
        );
      }

      if (remaining <= 0) {
        notificationManager.notifyScheduleFailed(group.name);
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [
    group.auxiliaryDuration,
    group.name,
    hasShownWarning,
    nextUnit,
    scheduledSession,
    tr,
  ]);

  useEffect(() => {
    setHasShownWarning(false);
  }, [scheduledSession?.chainId, scheduledSession?.scheduledAt]);

  return { timeRemaining };
}
