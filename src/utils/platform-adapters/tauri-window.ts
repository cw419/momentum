import type { PlatformWindowAdapter } from './types';
import { invokeCommand } from '../tauri-bridge';
import { isTauriMobile } from '../platform';

export const tauriWindowAdapter: PlatformWindowAdapter = {
  async setFullscreen(fullscreen: boolean): Promise<void> {
    if (isTauriMobile) return;
    await invokeCommand('set_fullscreen', { fullscreen });
  },

  async minimizeToTray(): Promise<void> {
    if (isTauriMobile) return;
    await invokeCommand('minimize_to_tray');
  },

  async focus(): Promise<void> {
    const { getCurrentWebviewWindow } = await import(
      '@tauri-apps/api/webviewWindow'
    );
    const win = getCurrentWebviewWindow();
    await win.setFocus();
  },
};
