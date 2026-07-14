import { beforeEach, describe, expect, it, vi } from 'vitest';

const exceptionRuleManagerMock = vi.hoisted(() => ({
  getAllRules: vi.fn(),
  deleteRule: vi.fn(),
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../services/ExceptionRuleManager', () => ({
  exceptionRuleManager: exceptionRuleManagerMock,
}));

vi.mock('../logger', () => ({
  logger: loggerMock,
}));

import { runMigration } from '../migration';

describe('runMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes only rules whose real names match the retired defaults', async () => {
    exceptionRuleManagerMock.getAllRules.mockResolvedValueOnce([
      { id: 'old-1', name: '喝水' },
      { id: 'custom-1', name: 'legacy-default-rule' },
    ]);

    await runMigration();

    expect(exceptionRuleManagerMock.deleteRule).toHaveBeenCalledTimes(1);
    expect(exceptionRuleManagerMock.deleteRule).toHaveBeenCalledWith('old-1');
    expect(exceptionRuleManagerMock.deleteRule).not.toHaveBeenCalledWith(
      'custom-1',
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      'MIGRATION',
      'Old default rules deleted successfully.',
      { count: 1 },
    );
  });

  it('skips deletion when no old default rules are present', async () => {
    exceptionRuleManagerMock.getAllRules.mockResolvedValueOnce([
      { id: 'new-1', name: 'custom-rule-a' },
      { id: 'new-2', name: 'custom-rule-b' },
    ]);

    await runMigration();
    expect(exceptionRuleManagerMock.deleteRule).not.toHaveBeenCalled();
  });

  it('logs an error when migration throws', async () => {
    exceptionRuleManagerMock.getAllRules.mockRejectedValueOnce(
      new Error('migration-boom'),
    );
    await runMigration();
    expect(loggerMock.error).toHaveBeenCalled();
  });
});
