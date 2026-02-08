import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../keys';
import {
  getActiveSession,
  getScheduledSessions,
  saveActiveSession,
  saveScheduledSessions,
} from '../sessions';

describe('storage/sessions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty scheduled sessions when storage is missing', () => {
    expect(getScheduledSessions()).toEqual([]);
  });

  it('hydrates scheduled sessions and applies auxiliarySignal fallback', () => {
    localStorage.setItem(
      STORAGE_KEYS.SCHEDULED_SESSIONS,
      JSON.stringify([
        {
          chainId: 'chain-1',
          scheduledAt: '2026-02-01T10:00:00.000Z',
          expiresAt: '2026-02-01T10:30:00.000Z',
        },
      ]),
    );

    const [session] = getScheduledSessions();
    expect(session.scheduledAt).toBeInstanceOf(Date);
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.auxiliarySignal).toBe('预约信号');
  });

  it('preserves scheduled session auxiliarySignal when provided', () => {
    localStorage.setItem(
      STORAGE_KEYS.SCHEDULED_SESSIONS,
      JSON.stringify([
        {
          chainId: 'chain-custom-signal',
          scheduledAt: '2026-02-02T10:00:00.000Z',
          expiresAt: '2026-02-02T10:30:00.000Z',
          auxiliarySignal: 'custom-signal',
        },
      ]),
    );

    const [session] = getScheduledSessions();
    expect(session.auxiliarySignal).toBe('custom-signal');
  });

  it('saves scheduled sessions as JSON', () => {
    saveScheduledSessions([
      {
        chainId: 'chain-2',
        scheduledAt: new Date('2026-02-01T11:00:00.000Z'),
        expiresAt: new Date('2026-02-01T11:30:00.000Z'),
        auxiliarySignal: 'signal',
      },
    ]);

    expect(localStorage.getItem(STORAGE_KEYS.SCHEDULED_SESSIONS)).toContain(
      'chain-2',
    );
  });

  it('returns null active session when storage is missing', () => {
    expect(getActiveSession()).toBeNull();
  });

  it('hydrates active session dates including optional pausedAt', () => {
    localStorage.setItem(
      STORAGE_KEYS.ACTIVE_SESSION,
      JSON.stringify({
        chainId: 'chain-1',
        startedAt: '2026-02-01T12:00:00.000Z',
        duration: 30,
        isPaused: true,
        pausedAt: '2026-02-01T12:10:00.000Z',
        totalPausedTime: 60,
      }),
    );

    const session = getActiveSession();
    expect(session).not.toBeNull();
    expect(session?.startedAt).toBeInstanceOf(Date);
    expect(session?.pausedAt).toBeInstanceOf(Date);
  });

  it('clears active session key when saving null', () => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, '{"chainId":"before"}');
    saveActiveSession(null);
    expect(localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION)).toBeNull();
  });

  it('saves active session when a session object is provided', () => {
    saveActiveSession({
      chainId: 'chain-active',
      startedAt: new Date('2026-02-03T00:00:00.000Z'),
      duration: 25,
      isPaused: false,
      totalPausedTime: 0,
    });

    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    expect(raw).toContain('chain-active');
    expect(raw).toContain('2026-02-03T00:00:00.000Z');
  });
});
