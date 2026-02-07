import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMobileOptimization } from '../useMobileOptimization';

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
}

describe('useMobileOptimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewport(1280, 720);
    document.body.className = '';
  });

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
  });

  it('detects desktop/mobile orientation and updates body classes', async () => {
    const { result } = renderHook(() => useMobileOptimization());

    await waitFor(() => {
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.orientation).toBe('landscape');
    });
    expect(document.body.classList.contains('desktop-device')).toBe(true);
    expect(document.body.classList.contains('landscape-mode')).toBe(true);

    setViewport(375, 812);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.orientation).toBe('portrait');
    });
    expect(document.body.classList.contains('mobile-device')).toBe(true);
    expect(document.body.classList.contains('portrait-mode')).toBe(true);
  });

  it('reacts to visual viewport keyboard changes', async () => {
    const listeners = new Map<string, () => void>();
    const visualViewport = {
      height: 900,
      addEventListener: vi.fn((event: string, cb: () => void) => listeners.set(event, cb)),
      removeEventListener: vi.fn((event: string) => listeners.delete(event)),
    };
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visualViewport });

    setViewport(1000, 1000);
    const { result } = renderHook(() => useMobileOptimization());

    await waitFor(() => {
      expect(result.current.isKeyboardVisible).toBe(false);
    });

    act(() => {
      visualViewport.height = 600;
      listeners.get('resize')?.();
    });

    await waitFor(() => {
      expect(result.current.isKeyboardVisible).toBe(true);
    });
    expect(document.body.classList.contains('keyboard-active')).toBe(true);
  });

  it('applies iOS viewport fixes when running on iPhone user-agent', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    meta.setAttribute('content', 'initial-scale=1');
    document.head.appendChild(meta);

    setViewport(390, 844);
    const { unmount } = renderHook(() => useMobileOptimization());

    await waitFor(() => {
      expect(meta.getAttribute('content')).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
      expect(document.documentElement.style.getPropertyValue('--vh')).not.toBe('');
    });

    unmount();
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent });
    document.head.removeChild(meta);
  });
});
