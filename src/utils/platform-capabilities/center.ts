import { logger } from '../logger';
import { isTauriMobile } from '../platform';
import {
  getFileAdapter,
  getHapticsAdapter,
  getNotificationAdapter,
  getWindowAdapter,
} from '../platform-adapters';
import type { PlatformCapabilityCenter, PlatformCapabilities } from './types';

function toPlacement(supported: boolean): 'topbar' | 'settings' | 'hidden' {
  if (!supported) return 'hidden';
  if (isTauriMobile) return 'settings';
  return 'topbar';
}

class PlatformCapabilityCenterImpl implements PlatformCapabilityCenter {
  private capabilitiesCache: PlatformCapabilities | null = null;

  async getCapabilities(): Promise<PlatformCapabilities> {
    if (this.capabilitiesCache) {
      return this.capabilitiesCache;
    }

    const [notificationAdapter, windowAdapter, fileAdapter, hapticsAdapter] =
      await Promise.all([
        getNotificationAdapter(),
        getWindowAdapter(),
        getFileAdapter(),
        getHapticsAdapter(),
      ]);

    const notificationSupported = notificationAdapter.isSupported();
    const notificationAdapterCaps = notificationAdapter.getCapabilities();
    const windowCaps = windowAdapter.getCapabilities();
    const fileCaps = fileAdapter.getCapabilities();
    const hapticsCaps = hapticsAdapter.getCapabilities();

    this.capabilitiesCache = {
      notification: {
        supported: notificationSupported,
        canRequestPermission:
          notificationSupported && notificationAdapterCaps.canRequestPermission,
        canShow: notificationSupported && notificationAdapterCaps.canShow,
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

  notification = {
    isSupported: async (): Promise<boolean> => {
      const caps = await this.getCapabilities();
      return caps.notification.supported;
    },

    getPermissionState: async (): Promise<'default' | 'granted' | 'denied'> => {
      const adapter = await getNotificationAdapter();
      return adapter.getPermissionState();
    },

    requestPermission: async (): Promise<'default' | 'granted' | 'denied'> => {
      const caps = await this.getCapabilities();
      if (!caps.notification.canRequestPermission) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Notification permission request is not supported on this platform',
        );
        return 'default';
      }

      const adapter = await getNotificationAdapter();
      return adapter.requestPermission();
    },

    show: async (payload: {
      title: string;
      body: string;
      icon?: string;
      tag?: string;
      requireInteraction?: boolean;
      silent?: boolean;
    }): Promise<void> => {
      const caps = await this.getCapabilities();
      if (!caps.notification.canShow) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Notification show is not supported on this platform',
        );
        return;
      }

      const adapter = await getNotificationAdapter();
      await adapter.show(payload);
    },
  };

  window = {
    setFullscreen: async (fullscreen: boolean): Promise<boolean> => {
      const caps = await this.getCapabilities();
      if (!caps.window.canSetFullscreen) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Fullscreen operation is not supported on this platform',
          { fullscreen },
        );
        return false;
      }

      try {
        const adapter = await getWindowAdapter();
        await adapter.setFullscreen(fullscreen);
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to set fullscreen state',
          { fullscreen },
          err,
        );
        return false;
      }
    },

    minimizeToTray: async (): Promise<boolean> => {
      const caps = await this.getCapabilities();
      if (!caps.window.canMinimizeToTray) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Minimize-to-tray is not supported on this platform',
        );
        return false;
      }

      try {
        const adapter = await getWindowAdapter();
        await adapter.minimizeToTray();
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to minimize window to tray',
          undefined,
          err,
        );
        return false;
      }
    },

    focus: async (): Promise<boolean> => {
      const caps = await this.getCapabilities();
      if (!caps.window.canFocus) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Window focus is not supported on this platform',
        );
        return false;
      }

      try {
        const adapter = await getWindowAdapter();
        await adapter.focus();
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to focus window',
          undefined,
          err,
        );
        return false;
      }
    },
  };

  file = {
    saveFile: async (data: string, defaultName: string): Promise<boolean> => {
      const caps = await this.getCapabilities();
      if (!caps.file.canSaveFile) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Save-file operation is not supported on this platform',
          { defaultName },
        );
        return false;
      }

      try {
        const adapter = await getFileAdapter();
        return adapter.saveFile(data, defaultName);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to save file',
          { defaultName },
          err,
        );
        return false;
      }
    },

    openFile: async (extensions: string[]): Promise<string | null> => {
      const caps = await this.getCapabilities();
      if (!caps.file.canOpenFile) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Open-file operation is not supported on this platform',
          { extensions },
        );
        return null;
      }

      try {
        const adapter = await getFileAdapter();
        return adapter.openFile(extensions);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to open file',
          { extensions },
          err,
        );
        return null;
      }
    },
  };

  haptics = {
    impact: async (style: 'light' | 'medium' | 'heavy'): Promise<boolean> => {
      const caps = await this.getCapabilities();
      if (!caps.haptics.canImpact) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Haptic impact is not supported on this platform',
          { style },
        );
        return false;
      }

      try {
        const adapter = await getHapticsAdapter();
        await adapter.impact(style);
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to perform haptic impact',
          { style },
          err,
        );
        return false;
      }
    },

    notification: async (
      type: 'success' | 'warning' | 'error',
    ): Promise<boolean> => {
      const caps = await this.getCapabilities();
      if (!caps.haptics.canNotification) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Haptic notification is not supported on this platform',
          { type },
        );
        return false;
      }

      try {
        const adapter = await getHapticsAdapter();
        await adapter.notification(type);
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to perform haptic notification',
          { type },
          err,
        );
        return false;
      }
    },

    selectionChanged: async (): Promise<boolean> => {
      const caps = await this.getCapabilities();
      if (!caps.haptics.canSelectionChanged) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Haptic selection feedback is not supported on this platform',
        );
        return false;
      }

      try {
        const adapter = await getHapticsAdapter();
        await adapter.selectionChanged();
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to perform haptic selection feedback',
          undefined,
          err,
        );
        return false;
      }
    },
  };
}

let singleton: PlatformCapabilityCenter | null = null;

export function getPlatformCapabilityCenter(): PlatformCapabilityCenter {
  if (!singleton) {
    singleton = new PlatformCapabilityCenterImpl();
  }
  return singleton;
}
