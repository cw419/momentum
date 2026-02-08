import type { MomentumStorage } from '../../storage/MomentumStorage';
import { runMigration } from '../../utils/migration';
import type { MigrationResult as DataMigrationResult } from '../../utils/data-migration/types';
import { exceptionRuleMigration } from '../ExceptionRuleMigration';
import type {
  MigrationProgress,
  MigrationResult,
  MigrationSuggestions,
  MigrationValidation,
  RollbackResult,
} from './migrationTypes';

/**
 * Single migration entrypoint used by app lifecycle and storage wiring.
 * Existing migration modules are treated as pluggable steps behind this facade.
 */
export class MigrationCoordinator {
  setStorage(storage: MomentumStorage | null): void {
    exceptionRuleMigration.setStorage(storage);
  }

  async runStartupMigrations(): Promise<void> {
    await runMigration();
  }

  async runDataMigrations(): Promise<DataMigrationResult> {
    const { dataMigrationManager } = await import('../../utils/dataMigration');
    return dataMigrationManager.migrateAll();
  }

  async needsExceptionRuleMigration(): Promise<boolean> {
    return exceptionRuleMigration.needsMigration();
  }

  async runExceptionRuleMigration(
    onProgress?: (progress: MigrationProgress) => void,
  ): Promise<MigrationResult> {
    return exceptionRuleMigration.migrate(onProgress);
  }

  async getExceptionRuleMigrationSuggestions(): Promise<MigrationSuggestions> {
    return exceptionRuleMigration.getMigrationSuggestions();
  }

  async rollbackExceptionRuleMigration(): Promise<RollbackResult> {
    return exceptionRuleMigration.rollback();
  }

  async validateExceptionRuleMigration(): Promise<MigrationValidation> {
    return exceptionRuleMigration.validateMigration();
  }

  async generateExceptionRuleMigrationReport(): Promise<string> {
    return exceptionRuleMigration.generateMigrationReport();
  }
}

export const migrationCoordinator = new MigrationCoordinator();
