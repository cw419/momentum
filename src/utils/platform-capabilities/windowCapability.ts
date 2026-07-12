import { getWindowAdapter } from '../platform-adapters';
import type { PlatformCapabilities, PlatformCapabilityCenter } from './types';
import { runBooleanCapability } from './runBooleanCapability';

export function createWindowCapability(
  getCapabilities: () => Promise<PlatformCapabilities>,
): PlatformCapabilityCenter['window'] {
  return {
    setFullscreen: async (fullscreen) =>
      runBooleanCapability({
        supported: (await getCapabilities()).window.canSetFullscreen,
        unsupportedMessage:
          'Fullscreen operation is not supported on this platform',
        failureMessage: 'Failed to set fullscreen state',
        context: { fullscreen },
        operation: async () =>
          (await getWindowAdapter()).setFullscreen(fullscreen),
      }),
    minimizeToTray: async () =>
      runBooleanCapability({
        supported: (await getCapabilities()).window.canMinimizeToTray,
        unsupportedMessage:
          'Minimize-to-tray is not supported on this platform',
        failureMessage: 'Failed to minimize window to tray',
        operation: async () => (await getWindowAdapter()).minimizeToTray(),
      }),
    focus: async () =>
      runBooleanCapability({
        supported: (await getCapabilities()).window.canFocus,
        unsupportedMessage: 'Window focus is not supported on this platform',
        failureMessage: 'Failed to focus window',
        operation: async () => (await getWindowAdapter()).focus(),
      }),
  };
}
