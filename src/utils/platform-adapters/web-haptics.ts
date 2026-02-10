import type { PlatformHapticsAdapter } from './types';

export const webHapticsAdapter: PlatformHapticsAdapter = {
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
