import { describe, expect, it } from 'vitest';
import { mapActiveSessionRow } from '../sessionMapper';

describe('mapActiveSessionRow', () => {
  it('maps supabase row to domain session shape', () => {
    const result = mapActiveSessionRow({
      id: 'session-1',
      chain_id: 'chain-1',
      started_at: '2026-02-07T00:00:00.000Z',
      duration: 25,
      is_paused: true,
      paused_at: '2026-02-07T00:10:00.000Z',
      total_paused_time: 15,
      is_forward_timer: true,
      forward_elapsed_time: 600,
    });

    expect(result).toMatchObject({
      id: 'session-1',
      chainId: 'chain-1',
      duration: 25,
      isPaused: true,
      totalPausedTime: 15,
      isForwardTimer: true,
      forwardElapsedTime: 600,
    });
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.pausedAt).toBeInstanceOf(Date);
  });

  it('fills forward timer defaults when fields are absent', () => {
    const result = mapActiveSessionRow({
      id: 'session-2',
      chain_id: 'chain-2',
      started_at: '2026-02-07T00:00:00.000Z',
      duration: 30,
      is_paused: false,
      paused_at: null,
      total_paused_time: 0,
    });

    expect(result.isForwardTimer).toBe(false);
    expect(result.forwardElapsedTime).toBe(0);
    expect(result.pausedAt).toBeUndefined();
  });
});
