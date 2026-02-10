import type {
  PlatformNotificationAdapter,
  NotificationPayload,
} from './types';

export const webNotificationAdapter: PlatformNotificationAdapter = {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
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
