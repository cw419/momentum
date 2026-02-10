import type {
  PlatformHapticsAdapter,
  HapticImpactStyle,
  HapticNotificationType,
} from './types';

export const tauriHapticsAdapter: PlatformHapticsAdapter = {
  async impact(style: HapticImpactStyle): Promise<void> {
    const { impactFeedback } = await import('@tauri-apps/plugin-haptics');
    await impactFeedback(style);
  },

  async notification(type: HapticNotificationType): Promise<void> {
    const { notificationFeedback } = await import('@tauri-apps/plugin-haptics');
    await notificationFeedback(type);
  },

  async selectionChanged(): Promise<void> {
    const { selectionFeedback } = await import('@tauri-apps/plugin-haptics');
    await selectionFeedback();
  },
};
