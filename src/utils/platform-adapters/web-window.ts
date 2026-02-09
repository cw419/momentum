import type { PlatformWindowAdapter } from './types';

export const webWindowAdapter: PlatformWindowAdapter = {
  async setFullscreen(fullscreen: boolean): Promise<void> {
    if (fullscreen) {
      await document.documentElement.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    }
  },

  async minimizeToTray(): Promise<void> {
    // Web 端无系统托盘，不做操作
  },

  async focus(): Promise<void> {
    window.focus();
  },
};
