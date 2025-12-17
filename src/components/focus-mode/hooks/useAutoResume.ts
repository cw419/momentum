import { useEffect, useRef, useState } from 'react';
import type { ActiveSession } from '../../../types';

const AUTO_RESUME_STORAGE_KEY = 'momentum_auto_resume';

interface UseAutoResumeParams {
  session: ActiveSession;
  onResume: () => void;
}

export function useAutoResume({ session, onResume }: UseAutoResumeParams) {
  const [autoResumeAt, setAutoResumeAt] = useState<number | null>(null);
  const [resumeCountdown, setResumeCountdown] = useState(0);
  const [elapsedPauseTime, setElapsedPauseTime] = useState(0);
  const resumeTimeoutRef = useRef<number | null>(null);

  const clearAutoResumeSchedule = () => {
    try {
      const dataStr = localStorage.getItem(AUTO_RESUME_STORAGE_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.chainId === session.chainId) {
          localStorage.removeItem(AUTO_RESUME_STORAGE_KEY);
        }
      }
    } catch {
      // ignore
    }

    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    setAutoResumeAt(null);
    setResumeCountdown(0);
  };

  const setupAutoResumeTimer = (resumeTime: number) => {
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
    }

    const delay = Math.max(0, resumeTime - Date.now());
    if (delay === 0) {
      clearAutoResumeSchedule();
      onResume();
      return;
    }

    resumeTimeoutRef.current = window.setTimeout(() => {
      onResume();
      clearAutoResumeSchedule();
    }, delay);
  };

  const scheduleAutoResume = (minutes: number) => {
    const resumeTime = Date.now() + minutes * 60 * 1000;
    setAutoResumeAt(resumeTime);

    try {
      localStorage.setItem(
        AUTO_RESUME_STORAGE_KEY,
        JSON.stringify({
          chainId: session.chainId,
          startedAt: session.startedAt.toISOString(),
          resumeAt: new Date(resumeTime).toISOString(),
        })
      );
    } catch {
      // ignore
    }

    setupAutoResumeTimer(resumeTime);
  };

  // 加载已有的自动恢复计划
  useEffect(() => {
    if (!session.isPaused) return;

    try {
      const dataStr = localStorage.getItem(AUTO_RESUME_STORAGE_KEY);
      if (!dataStr) return;

      const data = JSON.parse(dataStr);
      if (data.chainId === session.chainId && data.startedAt === session.startedAt.toISOString()) {
        const ts = new Date(data.resumeAt).getTime();
        if (ts > Date.now()) {
          setAutoResumeAt(ts);
          setupAutoResumeTimer(ts);
        } else {
          clearAutoResumeSchedule();
          onResume();
        }
      }
    } catch {
      // ignore
    }
  }, [onResume, session.chainId, session.isPaused, session.startedAt]);

  // 倒计时显示
  useEffect(() => {
    if (!session.isPaused) {
      setElapsedPauseTime(0);
      return;
    }

    if (autoResumeAt) {
      setResumeCountdown(Math.max(0, Math.ceil((autoResumeAt - Date.now()) / 1000)));

      const interval = window.setInterval(() => {
        const secs = Math.max(0, Math.ceil((autoResumeAt - Date.now()) / 1000));
        setResumeCountdown(secs);
        if (secs <= 0) {
          window.clearInterval(interval);
        }
      }, 1000);

      return () => window.clearInterval(interval);
    }

    const interval = window.setInterval(() => {
      if (!session.pausedAt) return;

      const now = Date.now();
      const pausedAt = new Date(session.pausedAt).getTime();
      setElapsedPauseTime(Math.floor((now - pausedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [autoResumeAt, session.isPaused, session.pausedAt]);

  // 清理自动恢复计划
  useEffect(() => {
    if (!session.isPaused) {
      clearAutoResumeSchedule();
    }
  }, [session.isPaused]);

  return {
    autoResumeAt,
    resumeCountdown,
    elapsedPauseTime,
    scheduleAutoResume,
    clearAutoResumeSchedule,
  };
}

