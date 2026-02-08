import type { CheckinResult, CheckinStats } from '../domain/checkin';
import type { AppError } from '../domain/errors';
import type { Result } from '../domain/result';
import { ok } from '../domain/result';
import type { MomentumStorage } from '../storage/MomentumStorage';

/**
 * Deprecated: prefer calling `storage.*` methods directly.
 * This wrapper keeps the old import path stable while routing operations through MomentumStorage.
 */
export class CheckinService {
  static async performDailyCheckin(
    storage: MomentumStorage,
  ): Promise<Result<CheckinResult, AppError>> {
    return storage.performDailyCheckin();
  }

  static async getUserStats(
    storage: MomentumStorage,
  ): Promise<Result<CheckinStats, AppError>> {
    return storage.getUserCheckinStats();
  }

  static async hasCheckedInToday(
    storage: MomentumStorage,
  ): Promise<Result<boolean, AppError>> {
    const stats = await storage.getUserCheckinStats();
    if (!stats.ok) return stats;
    return ok(stats.value.has_checked_in_today);
  }

  static async getUserPoints(
    storage: MomentumStorage,
  ): Promise<Result<number, AppError>> {
    const stats = await storage.getUserCheckinStats();
    if (!stats.ok) return stats;
    return ok(stats.value.total_points);
  }

  static async getCurrentStreak(
    storage: MomentumStorage,
  ): Promise<Result<number, AppError>> {
    const stats = await storage.getUserCheckinStats();
    if (!stats.ok) return stats;
    return ok(stats.value.current_streak);
  }
}
