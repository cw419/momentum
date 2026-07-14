import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitPointsChanged, POINTS_CHANGED_EVENT } from '../pointsEvents';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('emitPointsChanged', () => {
  it('dispatches the public points-changed event on window', () => {
    const listener = vi.fn();
    window.addEventListener(POINTS_CHANGED_EVENT, listener);

    try {
      emitPointsChanged();
    } finally {
      window.removeEventListener(POINTS_CHANGED_EVENT, listener);
    }

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as Event;
    expect(event).toBeInstanceOf(Event);
    expect(event.type).toBe(POINTS_CHANGED_EVENT);
  });

  it('is a safe no-op in a non-browser runtime', () => {
    vi.stubGlobal('window', undefined);

    expect(() => emitPointsChanged()).not.toThrow();
  });
});
