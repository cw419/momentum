import type { MomentumStorage } from '../../storage/MomentumStorage';
import { migrationCoordinator } from '../../services/migration';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorMessage';

export type CompletionHistory = Awaited<
  ReturnType<MomentumStorage['getCompletionHistory']>
>;

export async function cleanupExpiredDeletedChains(
  storage: MomentumStorage,
): Promise<void> {
  try {
    const cleanedCount = await storage.cleanupExpiredDeletedChains(30);
    if (cleanedCount > 0) {
      logger.info(
        'APP_SHELL',
        `Auto-cleaned ${cleanedCount} expired deleted chains`,
      );
    }
  } catch (error) {
    logger.warn('APP_SHELL', 'Auto cleanup failed', undefined, toError(error));
  }
}

export async function persistCompletionHistoryTimingMigration(
  storage: MomentumStorage,
  completionHistory: CompletionHistory,
): Promise<void> {
  try {
    await storage.saveCompletionHistory(completionHistory);
  } catch (error) {
    logger.warn(
      'APP_SHELL',
      'Failed to persist completion history timing migration',
      undefined,
      toError(error),
    );
  }
}

export async function runDevDataMigration(): Promise<void> {
  try {
    const migrationResult = await migrationCoordinator.runDataMigrations();

    if (!migrationResult.success || migrationResult.errors.length > 0) {
      logger.warn('APP_SHELL', 'Data migration completed with warnings', {
        migrationResult,
      });
      return;
    }

    logger.info('APP_SHELL', 'Data migration completed successfully');
  } catch (error) {
    logger.warn(
      'APP_SHELL',
      'Error occurred during data migration',
      undefined,
      toError(error),
    );
  }
}
