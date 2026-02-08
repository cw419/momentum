import type { ActiveSession } from '../../../types';

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

export function mapActiveSessionRow(row: ActiveSessionRowLike): ActiveSession {
  return {
    id: row.id,
    chainId: row.chain_id,
    startedAt: new Date(row.started_at),
    duration: row.duration,
    isPaused: row.is_paused,
    pausedAt: row.paused_at ? new Date(row.paused_at) : undefined,
    totalPausedTime: row.total_paused_time,
    isForwardTimer: row.is_forward_timer ?? false,
    forwardElapsedTime: row.forward_elapsed_time ?? 0,
  };
}
