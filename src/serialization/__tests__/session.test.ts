import { describe, expect, it } from 'vitest';
import { decodeActiveSession, decodeScheduledSession } from '../session';

describe('serialization/session', () => {
  it('decodes scheduled sessions with auxiliary signal fallback', () => {
    const session = decodeScheduledSession({
      chainId: 'chain-1',
      scheduledAt: '2026-02-01T00:00:00.000Z',
      expiresAt: '2026-02-01T01:00:00.000Z',
    });

    expect(session.scheduledAt).toBeInstanceOf(Date);
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.auxiliarySignal).toBe('预约信号');
  });

  it('decodes active sessions with forward timer defaults', () => {
    const session = decodeActiveSession({
      chainId: 'chain-1',
      startedAt: '2026-02-01T00:00:00.000Z',
      duration: 25,
      isPaused: false,
      totalPausedTime: 0,
    });

    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.pausedAt).toBeUndefined();
    expect(session.isForwardTimer).toBe(false);
    expect(session.forwardElapsedTime).toBe(0);
  });

  it('preserves the originating daily-plan item for an active session', () => {
    const session = decodeActiveSession({
      chainId: 'chain-1',
      dailyPlanItemId: 'plan-item-1',
      startedAt: '2026-02-01T00:00:00.000Z',
      duration: 25,
      isPaused: false,
      totalPausedTime: 0,
    });

    expect(session.dailyPlanItemId).toBe('plan-item-1');
  });
});
