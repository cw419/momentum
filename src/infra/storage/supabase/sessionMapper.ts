import type { ActiveSession } from '../../../types';
import {
  decodeActiveSession,
  decodeScheduledSession,
} from '../../../serialization';

type ScheduledSessionRowLike = {
  chain_id: string;
  scheduled_at: string;
  expires_at: string;
  auxiliary_signal: string | null;
};

type ActiveSessionRowLike = {
  id: string;
  chain_id: string;
  started_at: string;
  duration: number;
  is_paused: boolean;
  paused_at: string | null;
  total_paused_time: number;
  is_forward_timer?: boolean | null;
  forward_elapsed_time?: number | null;
};

export function mapScheduledSessionRow(row: ScheduledSessionRowLike) {
  return decodeScheduledSession({
    chainId: row.chain_id,
    scheduledAt: row.scheduled_at,
    expiresAt: row.expires_at,
    auxiliarySignal: row.auxiliary_signal,
  });
}

export function mapActiveSessionRow(row: ActiveSessionRowLike): ActiveSession {
  return decodeActiveSession({
    id: row.id,
    chainId: row.chain_id,
    startedAt: row.started_at,
    duration: row.duration,
    isPaused: row.is_paused,
    pausedAt: row.paused_at,
    totalPausedTime: row.total_paused_time,
    isForwardTimer: row.is_forward_timer ?? false,
    forwardElapsedTime: row.forward_elapsed_time ?? 0,
  });
}
