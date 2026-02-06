import { isDev } from '../env';
import { DataMigrationManager } from './DataMigrationManager';

export const dataMigrationManager = new DataMigrationManager();

async function migrateTimerData(): Promise<string> {
  const result = await dataMigrationManager.migrateAll();
  return dataMigrationManager.generateMigrationReport(result);
}

if (typeof window !== 'undefined' && isDev) {
  window.migrateTimerData = migrateTimerData;
  window.dataMigrationManager = dataMigrationManager;
}

