import { isTauriMobile } from '../platform';
import {
  getFileAdapter,
  getHapticsAdapter,
  getNotificationAdapter,
  getWindowAdapter,
} from '../platform-adapters';
import { createFileCapability } from './fileCapability';
import { createHapticsCapability } from './hapticsCapability';
import { createNotificationCapability } from './notificationCapability';
import type { PlatformCapabilityCenter, PlatformCapabilities } from './types';
import { createWindowCapability } from './windowCapability';

function toPlacement(supported: boolean): 'topbar' | 'settings' | 'hidden' {
  if (!supported) return 'hidden';
  return isTauriMobile ? 'settings' : 'topbar';
}

class PlatformCapabilityCenterImpl implements PlatformCapabilityCenter {
  private capabilitiesCache: PlatformCapabilities | null = null;

  notification = createNotificationCapability(() => this.getCapabilities());
  window = createWindowCapability(() => this.getCapabilities());
  file = createFileCapability(() => this.getCapabilities());
  haptics = createHapticsCapability(() => this.getCapabilities());

  async getCapabilities(): Promise<PlatformCapabilities> {
    if (this.capabilitiesCache) return this.capabilitiesCache;
    const [notification, window, file, haptics] = await Promise.all([
      getNotificationAdapter(),
      getWindowAdapter(),
      getFileAdapter(),
      getHapticsAdapter(),
    ]);
    const notificationSupported = notification.isSupported();
    const notificationCaps = notification.getCapabilities();
    const windowCaps = window.getCapabilities();
    const fileCaps = file.getCapabilities();
    const hapticsCaps = haptics.getCapabilities();
    this.capabilitiesCache = {
      notification: {
        supported: notificationSupported,
        canRequestPermission:
          notificationSupported && notificationCaps.canRequestPermission,
        canShow: notificationSupported && notificationCaps.canShow,
        togglePlacement: toPlacement(notificationSupported),
      },
      window: {
        canSetFullscreen: windowCaps.canSetFullscreen,
        canMinimizeToTray: windowCaps.canMinimizeToTray,
        canFocus: windowCaps.canFocus,
      },
      file: {
        canSaveFile: fileCaps.canSaveFile,
        canOpenFile: fileCaps.canOpenFile,
      },
      haptics: {
        canImpact: hapticsCaps.canImpact,
        canNotification: hapticsCaps.canNotification,
        canSelectionChanged: hapticsCaps.canSelectionChanged,
      },
    };
    return this.capabilitiesCache;
  }
}

let singleton: PlatformCapabilityCenter | null = null;

export function getPlatformCapabilityCenter(): PlatformCapabilityCenter {
  singleton ??= new PlatformCapabilityCenterImpl();
  return singleton;
}
