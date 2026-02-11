import type {
  PlatformNotificationAdapter,
  NotificationPayload,
} from './types';
import { invokeCommand } from '../tauri-bridge';

let cachedPermissionState: 'default' | 'granted' | 'denied' = 'default';

export const tauriNotificationAdapter: PlatformNotificationAdapter = {
  isSupported() {
    return true;
  },

  getCapabilities() {
    return {
      canRequestPermission: true,
      canShow: true,
    };
  },

  async getPermissionState(): Promise<'default' | 'granted' | 'denied'> {
    const { isPermissionGranted } = await import(
      '@tauri-apps/plugin-notification'
    );
    const granted = await isPermissionGranted();
    if (granted) {
      cachedPermissionState = 'granted';
      return 'granted';
    }
    return cachedPermissionState;
  },

  async requestPermission(): Promise<'default' | 'granted' | 'denied'> {
    const { isPermissionGranted, requestPermission } = await import(
      '@tauri-apps/plugin-notification'
    );
    const granted = await isPermissionGranted();
    if (granted) {
      cachedPermissionState = 'granted';
      return 'granted';
    }

    const permission = await requestPermission();
    if (permission === 'granted') {
      cachedPermissionState = 'granted';
      return 'granted';
    }

    cachedPermissionState = permission === 'denied' ? 'denied' : 'default';
    return cachedPermissionState;
  },

  async show(options: NotificationPayload): Promise<void> {
    await invokeCommand('send_notification', {
      title: options.title,
      body: options.body,
    });
  },
};
