import { describe, expect, it, vi, beforeEach } from 'vitest';
import { migrationCoordinator } from '../MigrationCoordinator';

const runMigrationMock = vi.hoisted(() => vi.fn());
const setStorageMock = vi.hoisted(() => vi.fn());
const needsMigrationMock = vi.hoisted(() => vi.fn(async () => false));
const migrateMock = vi.hoisted(() => vi.fn(async () => ({ migratedRules: 0 })));
const suggestionsMock = vi.hoisted(() => vi.fn(async () => ({ suggestions: [] })));
const rollbackMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const validateMock = vi.hoisted(() => vi.fn(async () => ({ valid: true })));
const reportMock = vi.hoisted(() => vi.fn(async () => 'ok'));
const migrateAllMock = vi.hoisted(() =>
  vi.fn(async () => ({
    success: true,
    migratedRecords: 0,
    errors: [],
    details: {
      completionHistoryMigrated: 0,
      taskTimeStatsCreated: 0,
      chainsUpdated: 0,
    },
  })),
);

vi.mock('../../../utils/migration', () => ({
  runMigration: runMigrationMock,
}));

vi.mock('../../ExceptionRuleMigration', () => ({
  exceptionRuleMigration: {
    setStorage: setStorageMock,
    needsMigration: needsMigrationMock,
    migrate: migrateMock,
    getMigrationSuggestions: suggestionsMock,
    rollback: rollbackMock,
    validateMigration: validateMock,
    generateMigrationReport: reportMock,
  },
}));

vi.mock('../../../utils/dataMigration', () => ({
  dataMigrationManager: {
    migrateAll: migrateAllMock,
  },
}));

describe('MigrationCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wires storage through unified migration entrypoint', () => {
    const storage = { kind: 'local' } as any;
    migrationCoordinator.setStorage(storage);
    migrationCoordinator.setStorage(null);

    expect(setStorageMock).toHaveBeenCalledWith(storage);
    expect(setStorageMock).toHaveBeenCalledWith(null);
  });

  it('runs startup migrations via legacy migration step', async () => {
    await migrationCoordinator.runStartupMigrations();

    expect(runMigrationMock).toHaveBeenCalledTimes(1);
  });

  it('runs data migrations through data migration manager', async () => {
    const result = await migrationCoordinator.runDataMigrations();

    expect(migrateAllMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
