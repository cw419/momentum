import type { ActiveSession, ScheduledSession } from '../types';
import {
  parseDateOrUndefined,
  parseTruthyDateOrNow,
  toBooleanWithDefault,
  toNumber,
  toStringWithDefault,
} from './primitives';

export interface SerializedScheduledSession {
  chainId: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  auxiliarySignal?: unknown;
}

export interface SerializedActiveSession {
  id?: string;
  chainId: string;
  startedAt?: string | null;
  duration: number;
  isPaused: boolean;
  pausedAt?: string | null;
  totalPausedTime: number;
  isForwardTimer?: unknown;
  forwardElapsedTime?: unknown;
}

export function decodeScheduledSession(
  raw: SerializedScheduledSession,
): ScheduledSession {
  return {
    chainId: raw.chainId,
    scheduledAt: parseTruthyDateOrNow(raw.scheduledAt),
    expiresAt: parseTruthyDateOrNow(raw.expiresAt),
    auxiliarySignal: toStringWithDefault(raw.auxiliarySignal, '预约信号'),
  };
}

export function decodeActiveSession(
  raw: SerializedActiveSession,
): ActiveSession {
  return {
    id: raw.id,
    chainId: raw.chainId,
    startedAt: parseTruthyDateOrNow(raw.startedAt),
    duration: toNumber(raw.duration, 0),
    isPaused: toBooleanWithDefault(raw.isPaused, false),
    pausedAt: parseDateOrUndefined(raw.pausedAt),
    totalPausedTime: toNumber(raw.totalPausedTime, 0),
    isForwardTimer: toBooleanWithDefault(raw.isForwardTimer, false),
    forwardElapsedTime: toNumber(raw.forwardElapsedTime, 0),
  };
}
