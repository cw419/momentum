import { getErrorMessage } from '../errorMessage';
import type { MigrationResult } from './types';
import { migrateCompletionHistory } from './history';
import { createTaskTimeStats } from './taskTimeStats';
import { updateChainStructure } from './chains';
import { cleanupInvalidData } from './cleanup';
import { validateDataIntegrity } from './integrity';
import { generateMigrationReport } from './report';

export class DataMigrationManager {
  async migrateAll(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedRecords: 0,
      errors: [],
      details: {
        completionHistoryMigrated: 0,
        taskTimeStatsCreated: 0,
        chainsUpdated: 0,
      },
    };

    try {
      const historyResult = await migrateCompletionHistory();
      result.details.completionHistoryMigrated = historyResult.migratedCount;
      result.migratedRecords += historyResult.migratedCount;
      result.errors.push(...historyResult.errors);

      const statsResult = await createTaskTimeStats();
      result.details.taskTimeStatsCreated = statsResult.createdCount;
      result.errors.push(...statsResult.errors);

      const chainsResult = await updateChainStructure();
      result.details.chainsUpdated = chainsResult.updatedCount;
      result.errors.push(...chainsResult.errors);

      await cleanupInvalidData();

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`迁移过程中发生错误: ${getErrorMessage(error)}`);
    }

    return result;
  }

  validateDataIntegrity = validateDataIntegrity;

  generateMigrationReport = generateMigrationReport;
}
