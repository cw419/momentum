import type { PlatformHapticsAdapter } from './types';

export const webHapticsAdapter: PlatformHapticsAdapter = {
  getCapabilities() {
    return {
      canImpact: false,
      canNotification: false,
      canSelectionChanged: false,
    };
  },

  async impact(): Promise<void> {
    // Web 端无触觉反馈
  },

  async notification(): Promise<void> {
    // Web 端无触觉反馈
  },

  async selectionChanged(): Promise<void> {
    // Web 端无触觉反馈
  },
};
