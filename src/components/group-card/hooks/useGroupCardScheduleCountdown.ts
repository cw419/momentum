import { useEffect, useRef, useState } from 'react';
import type { ChainTreeNode, ScheduledSession } from '../../../types';
import { getTimeRemaining } from '../../../utils/time';
import { systemNotificationService } from '../../../services/platform/SystemNotificationService';
import { fireAndForget } from '../../../utils/fireAndForget';

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
  const warnedScheduleRef = useRef<string | null>(null);
  const failedScheduleRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scheduledSession) return;

    const durationForWarning = nextUnit
      ? nextUnit.auxiliaryDuration
      : group.auxiliaryDuration;
    const notificationThreshold = getNotificationThreshold(durationForWarning);
    const scheduleKey = `${scheduledSession.chainId}:${scheduledSession.scheduledAt.getTime()}`;

    const updateTimer = () => {
      const remaining = getTimeRemaining(scheduledSession.expiresAt);
      setTimeRemaining(remaining);

      if (
        notificationThreshold &&
        remaining <= notificationThreshold &&
        remaining > 0 &&
        warnedScheduleRef.current !== scheduleKey
      ) {
        warnedScheduleRef.current = scheduleKey;
        const minutes = Math.max(1, Math.ceil(remaining / 60));
        fireAndForget(
          systemNotificationService.notifyScheduleWarning(
            group.name,
            tr(`${minutes}分钟`, `${minutes} min`),
          ),
          { label: 'group-schedule-warning-notification' },
        );
      }

      if (remaining <= 0 && failedScheduleRef.current !== scheduleKey) {
        failedScheduleRef.current = scheduleKey;
        fireAndForget(
          systemNotificationService.notifyScheduleFailed(group.name),
          { label: 'group-schedule-failed-notification' },
        );
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [group.auxiliaryDuration, group.name, nextUnit, scheduledSession, tr]);

  return { timeRemaining };
}
