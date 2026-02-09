import type {
  PlatformNotificationAdapter,
  PlatformWindowAdapter,
  PlatformFileAdapter,
  NotificationPayload,
} from './types';
import { invokeCommand } from '../tauri-bridge';

export const tauriNotificationAdapter: PlatformNotificationAdapter = {
  isSupported() {
    return true;
  },

  async requestPermission(): Promise<boolean> {
    const { isPermissionGranted, requestPermission } = await import(
      '@tauri-apps/plugin-notification'
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    return granted;
  },

  async show(options: NotificationPayload): Promise<void> {
    await invokeCommand('send_notification', {
      title: options.title,
      body: options.body,
    });
  },
};
