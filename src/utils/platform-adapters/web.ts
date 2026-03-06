import type { PlatformNotificationAdapter, NotificationPayload } from './types';

export const webNotificationAdapter: PlatformNotificationAdapter = {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getCapabilities() {
    const supported = this.isSupported();
    return {
      canRequestPermission: supported,
      canShow: supported,
    };
  },

  async getPermissionState(): Promise<'default' | 'granted' | 'denied'> {
    if (!this.isSupported()) return 'default';
    return Notification.permission;
  },

  async requestPermission(): Promise<'default' | 'granted' | 'denied'> {
    if (!this.isSupported()) return 'default';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result;
  },

  async show(options: NotificationPayload): Promise<void> {
    if (!this.isSupported()) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    if (!options.requireInteraction) {
      window.setTimeout(() => notification.close(), 5000);
    }
  },
};
