import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVirtualKeyboard } from '../useVirtualKeyboard';

function installViewport(height: number) {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  const viewport = {
    height,
    offsetTop: 0,
    addEventListener: vi.fn(
      (event: string, listener: EventListenerOrEventListenerObject) => {
        listeners.set(event, listener);
      },
    ),
    removeEventListener: vi.fn((event: string) => listeners.delete(event)),
  };
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  });
  return { viewport, listeners };
}

describe('useVirtualKeyboard', () => {
  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });
  });

  it('uses one visual viewport listener and cleans it up', () => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    const { viewport, listeners } = installViewport(800);
    const { result, unmount } = renderHook(() => useVirtualKeyboard());

    expect(viewport.addEventListener).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      keyboardHeight: 0,
      isKeyboardVisible: false,
    });

    act(() => {
      viewport.height = 500;
      const listener = listeners.get('resize');
      if (typeof listener === 'function') listener(new Event('resize'));
    });

    expect(result.current).toEqual({
      keyboardHeight: 300,
      isKeyboardVisible: true,
    });

    unmount();
    expect(viewport.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('stays hidden when visualViewport is unavailable', () => {
    const { result } = renderHook(() => useVirtualKeyboard());

    expect(result.current).toEqual({
      keyboardHeight: 0,
      isKeyboardVisible: false,
    });
  });
});
