import { isTauri } from '../platform';
import type {
  PlatformNotificationAdapter,
  PlatformWindowAdapter,
  PlatformFileAdapter,
} from './types';

export type { NotificationPayload } from './types';
export type {
  PlatformNotificationAdapter,
  PlatformWindowAdapter,
  PlatformFileAdapter,
};

let _notification: PlatformNotificationAdapter | null = null;
let _window: PlatformWindowAdapter | null = null;
let _file: PlatformFileAdapter | null = null;

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
