import type { PlatformWindowAdapter } from './types';

export const webWindowAdapter: PlatformWindowAdapter = {
  getCapabilities() {
    const canSetFullscreen =
      typeof document !== 'undefined' &&
      typeof document.documentElement.requestFullscreen === 'function';
    return {
      canSetFullscreen,
      canMinimizeToTray: false,
      canFocus:
        typeof window !== 'undefined' && typeof window.focus === 'function',
    };
  },

  async setFullscreen(fullscreen: boolean): Promise<void> {
    if (fullscreen) {
      await document.documentElement.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    }
  },

  async minimizeToTray(): Promise<void> {
    // Not supported on web.
  },

  async focus(): Promise<void> {
    window.focus();
  },
};
