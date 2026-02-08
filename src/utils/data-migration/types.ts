export interface MigrationResult {
  success: boolean;
  migratedRecords: number;
  errors: string[];
  details: {
    completionHistoryMigrated: number;
    taskTimeStatsCreated: number;
    chainsUpdated: number;
  };
}
