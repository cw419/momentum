import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveSession } from '../../../types';
import {
  AUTO_COMPLETION_GRACE_MINUTES,
  getAutoCompletionAt,
  useSessionAutoCompletion,
} from './useSessionAutoCompletion';

const NOW = new Date('2026-09-02T14:00:00.000Z');

function createSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    chainId: 'chain-1',
    startedAt: NOW,
    duration: 25,
    isPaused: false,
    totalPausedTime: 0,
    ...overrides,
  };
}

describe('useSessionAutoCompletion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-completes at the planned duration plus the grace period', async () => {
    const onAutoComplete = vi.fn();
    const session = createSession();
    renderHook(() =>
      useSessionAutoCompletion({
        session,
        isDurationless: false,
        onAutoComplete,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync((25 + 30) * 60 * 1000 - 1);
    });
    expect(onAutoComplete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(onAutoComplete).toHaveBeenCalledWith(
      new Date('2026-09-02T14:55:00.000Z'),
      55,
    );
  });

  it('completes an overdue restored session at its capped timestamp', () => {
    vi.setSystemTime(new Date('2026-09-02T18:00:00.000Z'));
    const onAutoComplete = vi.fn();
    const session = createSession({ totalPausedTime: 5 * 60 * 1000 });

    renderHook(() =>
      useSessionAutoCompletion({
        session,
        isDurationless: false,
        onAutoComplete,
      }),
    );

    expect(getAutoCompletionAt(session)).toEqual(
      new Date('2026-09-02T15:00:00.000Z'),
    );
    expect(onAutoComplete).toHaveBeenCalledWith(
      new Date('2026-09-02T15:00:00.000Z'),
      25 + AUTO_COMPLETION_GRACE_MINUTES,
    );
  });

  it('does not schedule paused or durationless sessions', async () => {
    const onAutoComplete = vi.fn();
    const { rerender } = renderHook(
      ({ session, isDurationless }) =>
        useSessionAutoCompletion({
          session,
          isDurationless,
          onAutoComplete,
        }),
      {
        initialProps: {
          session: createSession({ isPaused: true }),
          isDurationless: false,
        },
      },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000);
    });
    rerender({ session: createSession(), isDurationless: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000);
    });

    expect(onAutoComplete).not.toHaveBeenCalled();
  });
});
