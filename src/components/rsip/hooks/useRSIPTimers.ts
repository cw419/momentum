import { useCallback, useEffect, useState } from 'react';
import { systemNotificationService } from '../../../services/platform/SystemNotificationService';
import { fireAndForget } from '../../../utils/fireAndForget';

interface UseRSIPTimersResult {
  now: number;
  activeTimers: Record<string, number>;
  formatRemaining: (ms: number) => string;
  formatMinutesLabel: (minutes: number) => string;
  handleStartTimer: (nodeId: string, minutes: number) => void;
  handleStopTimerRequest: (nodeId: string) => void;
  confirmStopTimer: (nodeId: string) => void;
}

export function useRSIPTimers(
  tr: (zh: string, en: string) => string,
): UseRSIPTimersResult {
  const [now, setNow] = useState<number>(Date.now());
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Object.entries(activeTimers).forEach(([id, endsAt]) => {
      if (now >= endsAt) {
        setActiveTimers((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });

        fireAndForget(
          systemNotificationService.notifyTimerCompleted(
            tr('计时完成', 'Timer complete'),
            tr('RSIP 定式计时已结束', 'RSIP timer has ended'),
          ),
          { label: 'rsip-timer-completed-notification' },
        );
      }
    });
  }, [now, activeTimers, tr]);

  const formatRemaining = useCallback((ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, []);

  const formatMinutesLabel = useCallback(
    (minutes: number) => tr(`${minutes} 分钟`, `${minutes} min`),
    [tr],
  );

  const handleStartTimer = useCallback((nodeId: string, minutes: number) => {
    const endsAt = Date.now() + minutes * 60 * 1000;
    setActiveTimers((prev) => ({ ...prev, [nodeId]: endsAt }));
    fireAndForget(systemNotificationService.requestPermission('feature'), {
      label: 'rsip-notification-permission',
    });
  }, []);

  const handleStopTimerRequest = useCallback((_nodeId: string) => {
    // This just signals intent; actual stop happens via confirmStopTimer
  }, []);

  const confirmStopTimer = useCallback((nodeId: string) => {
    setActiveTimers((prev) => {
      const copy = { ...prev };
      delete copy[nodeId];
      return copy;
    });
  }, []);

  return {
    now,
    activeTimers,
    formatRemaining,
    formatMinutesLabel,
    handleStartTimer,
    handleStopTimerRequest,
    confirmStopTimer,
  };
}
