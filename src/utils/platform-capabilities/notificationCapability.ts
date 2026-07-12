import { logger } from '../logger';
import { getNotificationAdapter } from '../platform-adapters';
import type { PlatformCapabilities, PlatformCapabilityCenter } from './types';

export function createNotificationCapability(
  getCapabilities: () => Promise<PlatformCapabilities>,
): PlatformCapabilityCenter['notification'] {
  return {
    isSupported: async () => (await getCapabilities()).notification.supported,
    getPermissionState: async () =>
      (await getNotificationAdapter()).getPermissionState(),
    requestPermission: async () => {
      if (!(await getCapabilities()).notification.canRequestPermission) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Notification permission request is not supported on this platform',
        );
        return 'default';
      }
      return (await getNotificationAdapter()).requestPermission();
    },
    show: async (payload) => {
      if (!(await getCapabilities()).notification.canShow) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Notification show is not supported on this platform',
        );
        return;
      }
      await (await getNotificationAdapter()).show(payload);
    },
  };
}
