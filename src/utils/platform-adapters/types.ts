export interface PlatformNotificationAdapter {
  isSupported(): boolean;
  requestPermission(): Promise<boolean>;
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

export interface PlatformWindowAdapter {
  setFullscreen(fullscreen: boolean): Promise<void>;
  minimizeToTray(): Promise<void>;
  focus(): Promise<void>;
}

export interface PlatformFileAdapter {
  saveFile(data: string, defaultName: string): Promise<boolean>;
  openFile(extensions: string[]): Promise<string | null>;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export interface PlatformHapticsAdapter {
  impact(style: HapticImpactStyle): Promise<void>;
  notification(type: HapticNotificationType): Promise<void>;
  selectionChanged(): Promise<void>;
}
