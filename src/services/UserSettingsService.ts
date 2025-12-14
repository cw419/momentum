import type { MomentumStorage } from '../storage/MomentumStorage';
import type { AppError } from '../domain/errors';
import type { Result } from '../domain/result';
import type { GamblingSettings, UpdateSettingsResult } from '../domain/userSettings';

export type { GamblingSettings, UpdateSettingsResult } from '../domain/userSettings';

/**
 * Deprecated: prefer calling `storage.*` methods directly.
 * This wrapper keeps the old import path stable while routing operations through MomentumStorage.
 */
export class UserSettingsService {
  static async getGamblingSettings(storage: MomentumStorage): Promise<Result<GamblingSettings, AppError>> {
    return storage.getGamblingSettings();
  }

  static async toggleGamblingMode(storage: MomentumStorage): Promise<Result<UpdateSettingsResult, AppError>> {
    return storage.toggleGamblingMode();
  }

  static async isGamblingModeEnabled(storage: MomentumStorage): Promise<Result<boolean, AppError>> {
    return storage.isGamblingModeEnabled();
  }
}

export default UserSettingsService;

