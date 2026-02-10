import { isTauri, isTauriMobile } from '../platform';
import type {
  PlatformNotificationAdapter,
  PlatformWindowAdapter,
  PlatformFileAdapter,
  PlatformHapticsAdapter,
} from './types';

export type { NotificationPayload } from './types';
export type {
  PlatformNotificationAdapter,
  PlatformWindowAdapter,
  PlatformFileAdapter,
  PlatformHapticsAdapter,
};

let _notification: PlatformNotificationAdapter | null = null;
let _window: PlatformWindowAdapter | null = null;
let _file: PlatformFileAdapter | null = null;
let _haptics: PlatformHapticsAdapter | null = null;

export async function getNotificationAdapter(): Promise<PlatformNotificationAdapter> {
  if (_notification) return _notification;
  if (isTauri) {
    const { tauriNotificationAdapter } = await import('./tauri');
    _notification = tauriNotificationAdapter;
  } else {
    const { webNotificationAdapter } = await import('./web');
    _notification = webNotificationAdapter;
  }
  return _notification;
}

export async function getWindowAdapter(): Promise<PlatformWindowAdapter> {
  if (_window) return _window;
  if (isTauri) {
    const { tauriWindowAdapter } = await import('./tauri-window');
    _window = tauriWindowAdapter;
  } else {
    const { webWindowAdapter } = await import('./web-window');
    _window = webWindowAdapter;
  }
  return _window;
}

export async function getFileAdapter(): Promise<PlatformFileAdapter> {
  if (_file) return _file;
  if (isTauri) {
    const { tauriFileAdapter } = await import('./tauri-file');
    _file = tauriFileAdapter;
  } else {
    const { webFileAdapter } = await import('./web-file');
    _file = webFileAdapter;
  }
  return _file;
}

export async function getHapticsAdapter(): Promise<PlatformHapticsAdapter> {
  if (_haptics) return _haptics;
  if (isTauriMobile) {
    const { tauriHapticsAdapter } = await import('./tauri-haptics');
    _haptics = tauriHapticsAdapter;
  } else {
    const { webHapticsAdapter } = await import('./web-haptics');
    _haptics = webHapticsAdapter;
  }
  return _haptics;
}
