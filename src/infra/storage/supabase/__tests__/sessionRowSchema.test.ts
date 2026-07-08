import { describe, expect, it } from 'vitest';
import {
  activeSessionRowSchema,
  scheduledSessionRowSchema,
} from '../sessionRowSchema';

describe('scheduledSessionRowSchema', () => {
  it('accepts a valid scheduled session row', () => {
    const result = scheduledSessionRowSchema.safeParse({
      chain_id: 'chain-1',
      scheduled_at: '2026-01-01T09:00:00Z',
      expires_at: '2026-01-01T10:00:00Z',
      auxiliary_signal: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a row with a non-null auxiliary_signal', () => {
    const result = scheduledSessionRowSchema.safeParse({
      chain_id: 'chain-1',
      scheduled_at: '2026-01-01T09:00:00Z',
      expires_at: '2026-01-01T10:00:00Z',
      auxiliary_signal: 'some-signal',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a row missing chain_id', () => {
    const result = scheduledSessionRowSchema.safeParse({
      scheduled_at: '2026-01-01T09:00:00Z',
      expires_at: '2026-01-01T10:00:00Z',
      auxiliary_signal: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('activeSessionRowSchema', () => {
  it('accepts a complete active session row', () => {
    const result = activeSessionRowSchema.safeParse({
      id: 'session-1',
      chain_id: 'chain-1',
      started_at: '2026-01-01T09:00:00Z',
      duration: 25,
      is_paused: false,
      paused_at: null,
      total_paused_time: 0,
      is_forward_timer: false,
      forward_elapsed_time: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a row without optional forward timer fields', () => {
    const result = activeSessionRowSchema.safeParse({
      id: 'session-2',
      chain_id: 'chain-2',
      started_at: '2026-01-01T09:00:00Z',
      duration: 30,
      is_paused: true,
      paused_at: '2026-01-01T09:15:00Z',
      total_paused_time: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a row where duration is a string', () => {
    const result = activeSessionRowSchema.safeParse({
      id: 'session-3',
      chain_id: 'chain-3',
      started_at: '2026-01-01T09:00:00Z',
      duration: 'thirty',
      is_paused: false,
      paused_at: null,
      total_paused_time: 0,
    });
    expect(result.success).toBe(false);
  });
});
