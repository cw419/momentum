import type { ActiveSession, ScheduledSession } from '../../types';
import { STORAGE_KEYS } from './keys';

interface RawSessionData {
  auxiliarySignal?: string;
  scheduledAt: string;
  expiresAt: string;
}

export function getScheduledSessions(): ScheduledSession[] {
  const data = localStorage.getItem(STORAGE_KEYS.SCHEDULED_SESSIONS);
  if (!data) return [];

  return JSON.parse(data).map((session: RawSessionData & Record<string, unknown>) => ({
    ...session,
    auxiliarySignal: session.auxiliarySignal || '预约信号',
    scheduledAt: new Date(session.scheduledAt),
    expiresAt: new Date(session.expiresAt),
  }));
}

export function saveScheduledSessions(sessions: ScheduledSession[]): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULED_SESSIONS, JSON.stringify(sessions));
}

export function getActiveSession(): ActiveSession | null {
  const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  if (!data) return null;

  const session = JSON.parse(data) as Record<string, unknown> & { startedAt: string; pausedAt?: string | null };
  return {
    ...session,
    startedAt: new Date(session.startedAt),
    pausedAt: session.pausedAt ? new Date(session.pausedAt) : undefined,
  } as ActiveSession;
}

export function saveActiveSession(session: ActiveSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }
}

