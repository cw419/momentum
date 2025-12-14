import type { MomentumStorage } from '../storage/MomentumStorage';
import type { AppError } from '../domain/errors';
import type { Result } from '../domain/result';
import type { BetPlacementRequest, BetPlacementResult } from '../domain/betting';

export type { BetPlacementRequest, BetPlacementResult } from '../domain/betting';

/**
 * Deprecated: prefer calling `storage.*` methods directly.
 * This wrapper keeps the old import path stable while routing all operations through MomentumStorage.
 */
export class BettingService {
  static async placeBet(
    storage: MomentumStorage,
    betRequest: BetPlacementRequest
  ): Promise<Result<BetPlacementResult, AppError>> {
    return storage.placeBet(betRequest);
  }

  static async getUserAvailablePoints(storage: MomentumStorage): Promise<Result<number, AppError>> {
    return storage.getUserAvailablePoints();
  }

  static async getTodayBetAmount(storage: MomentumStorage): Promise<Result<number, AppError>> {
    return storage.getTodayBetAmount();
  }
}

export default BettingService;

