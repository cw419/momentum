import type {
  HapticImpactStyle,
  HapticNotificationType,
  NotificationPayload,
} from '../platform-adapters';

export type NotificationPermissionState = 'default' | 'granted' | 'denied';

export type NotificationTogglePlacement = 'topbar' | 'settings' | 'hidden';

export interface NotificationCapabilities {
  supported: boolean;
  canRequestPermission: boolean;
  canShow: boolean;
  togglePlacement: NotificationTogglePlacement;
}

export interface WindowCapabilities {
  canSetFullscreen: boolean;
  canMinimizeToTray: boolean;
  canFocus: boolean;
}

export interface FileCapabilities {
  canSaveFile: boolean;
  canOpenFile: boolean;
}

export interface HapticsCapabilities {
  canImpact: boolean;
  canNotification: boolean;
  canSelectionChanged: boolean;
}

export interface PlatformCapabilities {
  notification: NotificationCapabilities;
  window: WindowCapabilities;
  file: FileCapabilities;
  haptics: HapticsCapabilities;
}

export interface PlatformCapabilityCenter {
  getCapabilities(): Promise<PlatformCapabilities>;
  notification: {
    isSupported(): Promise<boolean>;
    getPermissionState(): Promise<NotificationPermissionState>;
    requestPermission(): Promise<NotificationPermissionState>;
    show(payload: NotificationPayload): Promise<void>;
  };
  window: {
    setFullscreen(fullscreen: boolean): Promise<boolean>;
    minimizeToTray(): Promise<boolean>;
    focus(): Promise<boolean>;
  };
  file: {
    saveFile(data: string, defaultName: string): Promise<boolean>;
    openFile(extensions: string[]): Promise<string | null>;
  };
  haptics: {
    impact(style: HapticImpactStyle): Promise<boolean>;
    notification(type: HapticNotificationType): Promise<boolean>;
    selectionChanged(): Promise<boolean>;
  };
}
