export interface PlatformNotificationAdapter {
  isSupported(): boolean;
  getCapabilities(): NotificationAdapterCapabilities;
  getPermissionState(): Promise<'default' | 'granted' | 'denied'>;
  requestPermission(): Promise<'default' | 'granted' | 'denied'>;
  show(options: NotificationPayload): Promise<void>;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationAdapterCapabilities {
  canRequestPermission: boolean;
  canShow: boolean;
}

export interface PlatformWindowAdapter {
  getCapabilities(): WindowAdapterCapabilities;
  setFullscreen(fullscreen: boolean): Promise<void>;
  minimizeToTray(): Promise<void>;
  focus(): Promise<void>;
}

interface WindowAdapterCapabilities {
  canSetFullscreen: boolean;
  canMinimizeToTray: boolean;
  canFocus: boolean;
}

export interface PlatformFileAdapter {
  getCapabilities(): FileAdapterCapabilities;
  saveFile(data: string, defaultName: string): Promise<boolean>;
  openFile(extensions: string[]): Promise<string | null>;
}

interface FileAdapterCapabilities {
  canSaveFile: boolean;
  canOpenFile: boolean;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export interface PlatformHapticsAdapter {
  getCapabilities(): HapticsAdapterCapabilities;
  impact(style: HapticImpactStyle): Promise<void>;
  notification(type: HapticNotificationType): Promise<void>;
  selectionChanged(): Promise<void>;
}

interface HapticsAdapterCapabilities {
  canImpact: boolean;
  canNotification: boolean;
  canSelectionChanged: boolean;
}
