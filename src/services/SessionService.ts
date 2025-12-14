import type { MomentumStorage } from '../storage/MomentumStorage';
import type { AppError } from '../domain/errors';
import type { Result } from '../domain/result';

/**
 * Deprecated: prefer calling `storage.*` methods directly.
 * This wrapper keeps the old import path stable while routing operations through MomentumStorage.
 */
export class SessionService {
  static async createActiveSession(storage: MomentumStorage, chainId: string, duration: number): Promise<Result<string, AppError>> {
    return storage.createBettingSession(chainId, duration);
  }

  static async deleteActiveSession(storage: MomentumStorage, sessionId: string): Promise<Result<void, AppError>> {
    return storage.deleteBettingSession(sessionId);
  }

  static async completeTaskWithBetting(
    storage: MomentumStorage,
    sessionId: string,
    wasSuccessful: boolean = true,
    completionNotes?: string
  ): Promise<Result<unknown, AppError>> {
    return storage.completeTaskWithBetting(sessionId, wasSuccessful, completionNotes);
  }
}

export default SessionService;

