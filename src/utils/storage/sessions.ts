import type { ActiveSession, ScheduledSession } from '../../types';
import {
  decodeActiveSession,
  decodeScheduledSession,
  type SerializedActiveSession,
  type SerializedScheduledSession,
} from '../../serialization';
import { STORAGE_KEYS } from './keys';

export function getScheduledSessions(): ScheduledSession[] {
  const data = localStorage.getItem(STORAGE_KEYS.SCHEDULED_SESSIONS);
  if (!data) return [];

  return (JSON.parse(data) as SerializedScheduledSession[]).map(
    decodeScheduledSession,
  );
}

export function saveScheduledSessions(sessions: ScheduledSession[]): void {
  localStorage.setItem(
    STORAGE_KEYS.SCHEDULED_SESSIONS,
    JSON.stringify(sessions),
  );
}

export function setScheduledSession(session: ScheduledSession): void {
  const sessions = getScheduledSessions();
  const nextSessions = sessions.filter(
    (item) => item.chainId !== session.chainId,
  );
  nextSessions.push(session);
  saveScheduledSessions(nextSessions);
}

export function removeScheduledSession(chainId: string): void {
  const sessions = getScheduledSessions();
  saveScheduledSessions(
    sessions.filter((session) => session.chainId !== chainId),
  );
}

export function getActiveSession(): ActiveSession | null {
  const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  if (!data) return null;

  return decodeActiveSession(JSON.parse(data) as SerializedActiveSession);
}

export function saveActiveSession(session: ActiveSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }
}
