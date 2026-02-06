import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExceptionRule } from '../../types';

const baseRule: ExceptionRule = {
  id: 'rule-1',
  name: 'Test Rule',
  type: 'pause',
  description: 'desc',
  scope: 'global',
  chainId: undefined,
  createdAt: new Date('2026-02-06T00:00:00.000Z'),
  lastUsedAt: undefined,
  usageCount: 0,
  isActive: true,
  isArchived: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function loadRuleStateManager() {
  vi.resetModules();

  const loggerMock = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const exceptionRuleStorageMock = {
    createRule: vi.fn(),
    getRuleById: vi.fn(),
    getRules: vi.fn(),
  };

  vi.doMock('../../utils/env', () => ({ isDev: false }));
  vi.doMock('../../utils/logger', () => ({ logger: loggerMock }));
  vi.doMock('../../utils/random', () => ({ randomId: vi.fn(() => 'rule-real-1') }));
  vi.doMock('../ExceptionRuleStorage', () => ({
    exceptionRuleStorage: exceptionRuleStorageMock,
  }));

  const mod = await import('../RuleStateManager');
  return {
    manager: mod.ruleStateManager,
    loggerMock,
    exceptionRuleStorageMock,
  };
}

describe('RuleStateManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates temporary and real IDs', async () => {
    const { manager } = await loadRuleStateManager();
    manager.clearAllStates();

    const t1 = manager.generateTemporaryId();
    const t2 = manager.generateTemporaryId();
    const real = manager.generateRealId();

    expect(t1).toMatch(/^temp_/);
    expect(t2).toMatch(/^temp_/);
    expect(t1).not.toBe(t2);
    expect(real).toBe('rule-real-1');
  });

  it('supports optimistic creation and waitForRuleCreation success flow', async () => {
    const { manager, exceptionRuleStorageMock } = await loadRuleStateManager();
    manager.clearAllStates();

    exceptionRuleStorageMock.createRule.mockResolvedValue({
      ...baseRule,
      id: 'db-rule-id',
      name: 'Optimistic Rule',
    });

    const { temporaryId, temporaryRule } = manager.startOptimisticCreation('Optimistic Rule', 'pause', 'desc');
    expect(temporaryRule.id).toBe(temporaryId);

    const immediateValidation = await manager.validateRuleId(temporaryId);
    expect(immediateValidation.isValid).toBe(true);
    expect(immediateValidation.isTemporary).toBe(true);

    const created = await manager.waitForRuleCreation(temporaryId);
    expect(created.id).toBe('rule-real-1');
    expect(manager.getRealRuleId(temporaryId)).toBe('rule-real-1');

    const postValidation = await manager.validateRuleId(temporaryId);
    expect(postValidation.isValid).toBe(true);
    expect(postValidation.realId).toBe('rule-real-1');
  });

  it('marks state as error when optimistic creation fails', async () => {
    const { manager, exceptionRuleStorageMock } = await loadRuleStateManager();
    manager.clearAllStates();

    exceptionRuleStorageMock.createRule.mockRejectedValue(new Error('storage unavailable'));
    const { temporaryId } = manager.startOptimisticCreation('Broken Rule', 'pause');

    await expect(manager.waitForRuleCreation(temporaryId)).rejects.toThrow('storage unavailable');

    const state = manager.getRuleState(temporaryId);
    expect(state?.status).toBe('error');
    expect(state?.validationErrors?.[0]).toContain('storage unavailable');
  });

  it('validateRuleId resolves non-temporary IDs via storage', async () => {
    const { manager, exceptionRuleStorageMock } = await loadRuleStateManager();
    manager.clearAllStates();

    exceptionRuleStorageMock.getRuleById.mockResolvedValueOnce(baseRule).mockResolvedValueOnce(null);

    const valid = await manager.validateRuleId('rule-1');
    expect(valid).toMatchObject({
      isValid: true,
      isTemporary: false,
      realId: 'rule-1',
    });

    const invalid = await manager.validateRuleId('missing-rule');
    expect(invalid.isValid).toBe(false);
    expect(invalid.isTemporary).toBe(false);
    expect(invalid.error).toBeDefined();
  });

  it('ruleExists and getRule handle temporary IDs and mapped real IDs', async () => {
    const { manager, exceptionRuleStorageMock } = await loadRuleStateManager();
    manager.clearAllStates();

    const wait = deferred<ExceptionRule>();
    exceptionRuleStorageMock.createRule.mockReturnValue(wait.promise);

    const { temporaryId } = manager.startOptimisticCreation('Pending Rule', 'pause');
    expect(await manager.ruleExists(temporaryId)).toBe(true);

    wait.resolve({ ...baseRule, id: 'db-id' });
    const resolved = await manager.waitForRuleCreation(temporaryId);
    expect(resolved.id).toBe('rule-real-1');

    exceptionRuleStorageMock.getRuleById.mockResolvedValueOnce({ ...baseRule, id: 'rule-real-1' });
    expect(await manager.ruleExists(temporaryId)).toBe(true);
  });

  it('start and stop are idempotent and periodic cleanup runs on interval', async () => {
    const { manager } = await loadRuleStateManager();
    manager.clearAllStates();
    manager.stop();

    const cleanupSpy = vi.spyOn(manager, 'cleanupExpiredStates');

    manager.start();
    manager.start();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    manager.stop();
    manager.stop();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});
