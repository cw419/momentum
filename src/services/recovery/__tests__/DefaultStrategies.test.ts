import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExceptionRuleError, ExceptionRuleException } from '../../../types';
import { RecoveryStrategyRegistry } from '../RecoveryStrategy';

const ruleStateManagerMock = vi.hoisted(() => ({
  waitForRuleCreation: vi.fn(),
}));

const dataIntegrityCheckerMock = vi.hoisted(() => ({
  checkRuleDataIntegrity: vi.fn(),
  autoFixIssues: vi.fn(),
}));

const recoveryOptionsProviderMock = vi.hoisted(() => ({
  getRecoveryOptions: vi.fn(),
}));

const extractRuleIdFromErrorMock = vi.hoisted(() => vi.fn());
const recoveryHandlersMock = vi.hoisted(() => ({
  handleValidationFix: vi.fn(),
  handleGenericRecovery: vi.fn(),
  handleSystemReset: vi.fn(),
}));

vi.mock('../../RuleStateManager', () => ({
  ruleStateManager: ruleStateManagerMock,
}));

vi.mock('../../DataIntegrityChecker', () => ({
  dataIntegrityChecker: dataIntegrityCheckerMock,
}));

vi.mock('../RecoveryOptionsProvider', () => ({
  recoveryOptionsProvider: recoveryOptionsProviderMock,
}));

vi.mock('../RecoveryHandlers', () => ({
  extractRuleIdFromError: extractRuleIdFromErrorMock,
  recoveryHandlers: recoveryHandlersMock,
}));

vi.mock('../../../utils/runtimeI18n', () => ({
  tr: (_zh: string, en: string) => en,
}));

import {
  createRecoveryFailureResult,
  createUnknownErrorResult,
  initializeDefaultStrategies,
} from '../DefaultStrategies';

function createError(type: ExceptionRuleError, message = 'test error'): ExceptionRuleException {
  return new ExceptionRuleException(type, message);
}

describe('recovery/DefaultStrategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recoveryOptionsProviderMock.getRecoveryOptions.mockReturnValue([
      {
        id: 'fallback',
        label: 'Fallback',
        description: 'fallback action',
        type: 'secondary',
        handler: async () => ({ success: false, message: 'fallback' }),
      },
    ]);
    recoveryHandlersMock.handleValidationFix.mockResolvedValue({ success: true, message: 'validation fixed' });
    recoveryHandlersMock.handleGenericRecovery.mockResolvedValue({ success: true, message: 'generic fixed' });
    recoveryHandlersMock.handleSystemReset.mockResolvedValue({ success: true, message: 'reset done' });
    extractRuleIdFromErrorMock.mockReturnValue(null);
  });

  it('registers built-in strategies for expected error types', () => {
    const registry = new RecoveryStrategyRegistry();
    initializeDefaultStrategies(registry);

    expect(registry.hasStrategies(ExceptionRuleError.RULE_NOT_FOUND)).toBe(true);
    expect(registry.hasStrategies(ExceptionRuleError.DUPLICATE_RULE_NAME)).toBe(true);
    expect(registry.hasStrategies(ExceptionRuleError.RULE_TYPE_MISMATCH)).toBe(true);
    expect(registry.hasStrategies(ExceptionRuleError.STORAGE_ERROR)).toBe(true);
    expect(registry.hasStrategies(ExceptionRuleError.VALIDATION_ERROR)).toBe(true);
  });

  it('handles missing rules by recovering temporary rules or returning user actions', async () => {
    const registry = new RecoveryStrategyRegistry();
    initializeDefaultStrategies(registry);
    const strategy = registry.getStrategies(ExceptionRuleError.RULE_NOT_FOUND)[0];

    extractRuleIdFromErrorMock.mockReturnValueOnce('temp_123');
    ruleStateManagerMock.waitForRuleCreation.mockResolvedValueOnce({ id: 'temp_123', name: 'Recovered' });
    const recovered = await strategy!.handler(createError(ExceptionRuleError.RULE_NOT_FOUND), {} as never);
    expect(recovered).toEqual(
      expect.objectContaining({
        success: true,
        recoveredData: { id: 'temp_123', name: 'Recovered' },
      })
    );

    extractRuleIdFromErrorMock.mockReturnValueOnce('rule-regular');
    const unresolved = await strategy!.handler(createError(ExceptionRuleError.RULE_NOT_FOUND), {} as never);
    expect(unresolved.success).toBe(false);
    expect(unresolved.requiresUserAction).toBe(true);
    expect(unresolved.actions).toHaveLength(1);
  });

  it('returns user-choice actions for duplicate and type mismatch errors', async () => {
    const registry = new RecoveryStrategyRegistry();
    initializeDefaultStrategies(registry);

    const duplicate = await registry
      .getStrategies(ExceptionRuleError.DUPLICATE_RULE_NAME)[0]!
      .handler(createError(ExceptionRuleError.DUPLICATE_RULE_NAME), {} as never);
    const mismatch = await registry
      .getStrategies(ExceptionRuleError.RULE_TYPE_MISMATCH)[0]!
      .handler(createError(ExceptionRuleError.RULE_TYPE_MISMATCH), {} as never);

    expect(duplicate.requiresUserAction).toBe(true);
    expect(mismatch.requiresUserAction).toBe(true);
    expect(recoveryOptionsProviderMock.getRecoveryOptions).toHaveBeenCalledTimes(2);
  });

  it('auto-fixes storage errors when integrity issues are fixable and falls back otherwise', async () => {
    const registry = new RecoveryStrategyRegistry();
    initializeDefaultStrategies(registry);
    const strategy = registry.getStrategies(ExceptionRuleError.STORAGE_ERROR)[0];

    dataIntegrityCheckerMock.checkRuleDataIntegrity.mockResolvedValueOnce({
      issues: [{ id: '1', autoFixable: true }, { id: '2', autoFixable: false }],
    });
    dataIntegrityCheckerMock.autoFixIssues.mockResolvedValueOnce([{ success: true }, { success: false }]);

    const autoFixed = await strategy!.handler(createError(ExceptionRuleError.STORAGE_ERROR), {} as never);
    expect(autoFixed).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Auto-fixed 1 data issue(s)',
      })
    );

    dataIntegrityCheckerMock.checkRuleDataIntegrity.mockRejectedValueOnce(new Error('integrity check failed'));
    const fallback = await strategy!.handler(createError(ExceptionRuleError.STORAGE_ERROR), {} as never);
    expect(fallback.success).toBe(false);
    expect(fallback.requiresUserAction).toBe(true);
  });

  it('creates validation strategy actions that delegate to recovery handlers', async () => {
    const registry = new RecoveryStrategyRegistry();
    initializeDefaultStrategies(registry);
    const strategy = registry.getStrategies(ExceptionRuleError.VALIDATION_ERROR)[0];
    const error = createError(ExceptionRuleError.VALIDATION_ERROR);

    const result = await strategy!.handler(error, {} as never);
    expect(result.requiresUserAction).toBe(true);
    expect(result.actions).toHaveLength(1);

    const actionResult = await result.actions?.[0]?.handler();
    expect(recoveryHandlersMock.handleValidationFix).toHaveBeenCalledWith(error);
    expect(actionResult).toEqual({ success: true, message: 'validation fixed' });
  });

  it('builds unknown and failure recovery results with executable actions', async () => {
    const unknown = createUnknownErrorResult('CUSTOM_ERROR');
    expect(unknown.success).toBe(false);
    expect(unknown.message).toBe('Unknown error type: CUSTOM_ERROR');
    await unknown.actions?.[0]?.handler();
    expect(recoveryHandlersMock.handleGenericRecovery).toHaveBeenCalledTimes(1);

    const failed = createRecoveryFailureResult();
    expect(failed.success).toBe(false);
    expect(failed.actions).toHaveLength(2);

    const manual = await failed.actions?.[0]?.handler();
    expect(manual).toEqual({
      success: false,
      message: 'Manual intervention required',
    });

    await failed.actions?.[1]?.handler();
    expect(recoveryHandlersMock.handleSystemReset).toHaveBeenCalledTimes(1);
  });
});

