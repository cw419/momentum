import { getHapticsAdapter } from '../platform-adapters';
import type { PlatformCapabilities, PlatformCapabilityCenter } from './types';
import { runBooleanCapability } from './runBooleanCapability';

export function createHapticsCapability(
  getCapabilities: () => Promise<PlatformCapabilities>,
): PlatformCapabilityCenter['haptics'] {
  return {
    impact: async (style) =>
      runBooleanCapability({
        supported: (await getCapabilities()).haptics.canImpact,
        unsupportedMessage: 'Haptic impact is not supported on this platform',
        failureMessage: 'Failed to perform haptic impact',
        context: { style },
        operation: async () => (await getHapticsAdapter()).impact(style),
      }),
    notification: async (type) =>
      runBooleanCapability({
        supported: (await getCapabilities()).haptics.canNotification,
        unsupportedMessage:
          'Haptic notification is not supported on this platform',
        failureMessage: 'Failed to perform haptic notification',
        context: { type },
        operation: async () => (await getHapticsAdapter()).notification(type),
      }),
    selectionChanged: async () =>
      runBooleanCapability({
        supported: (await getCapabilities()).haptics.canSelectionChanged,
        unsupportedMessage:
          'Haptic selection feedback is not supported on this platform',
        failureMessage: 'Failed to perform haptic selection feedback',
        operation: async () => (await getHapticsAdapter()).selectionChanged(),
      }),
  };
}
