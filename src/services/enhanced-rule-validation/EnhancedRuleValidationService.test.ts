import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExceptionRuleError,
  ExceptionRuleException,
  ExceptionRuleType,
  type ExceptionRule,
} from '../../types';

const exceptionRuleStorageMock = vi.hoisted(() => ({
  getRuleById: vi.fn(),
  getRules: vi.fn(),
}));

vi.mock('../ExceptionRuleStorage', () => ({
  exceptionRuleStorage: exceptionRuleStorageMock,
}));

import { enhancedRuleValidationService } from './EnhancedRuleValidationService';

function createRule(overrides: Partial<ExceptionRule> = {}): ExceptionRule {
  return {
    id: 'rule-1',
    name: 'Focus rule',
    type: ExceptionRuleType.PAUSE_ONLY,
    scope: 'global',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    usageCount: 0,
    isActive: true,
    ...overrides,
  };
}

describe('EnhancedRuleValidationService', () => {
  beforeEach(() => {
    enhancedRuleValidationService.clearValidationCache();
    exceptionRuleStorageMock.getRuleById.mockReset();
    exceptionRuleStorageMock.getRules.mockReset();
  });

  describe('preValidateRuleUsage', () => {
    it('returns a fault-revealing missing-rule result', async () => {
      exceptionRuleStorageMock.getRuleById.mockResolvedValue(null);

      const result = await enhancedRuleValidationService.preValidateRuleUsage(
        'missing-rule',
        'pause',
      );

      expect(result).toMatchObject({
        isValid: false,
        errorType: ExceptionRuleError.RULE_NOT_FOUND,
        errorMessage: '规则 ID missing-rule 不存在',
        debugInfo: { ruleId: 'missing-rule', actionType: 'pause' },
      });
      expect(result.suggestedActions).toEqual([
        expect.objectContaining({
          type: 'create_new',
          label: '创建新规则',
        }),
      ]);
      await expect(
        result.suggestedActions?.[0]?.handler(),
      ).resolves.toBeUndefined();
    });

    it('rejects inactive rules before type validation', async () => {
      const inactiveRule = createRule({
        name: 'Archived pause rule',
        isActive: false,
      });
      exceptionRuleStorageMock.getRuleById.mockResolvedValue(inactiveRule);

      const result = await enhancedRuleValidationService.preValidateRuleUsage(
        inactiveRule.id,
        'pause',
      );

      expect(result).toMatchObject({
        isValid: false,
        errorType: ExceptionRuleError.RULE_NOT_FOUND,
        errorMessage: '规则 "Archived pause rule" 已被删除或停用',
        debugInfo: { rule: inactiveRule, actionType: 'pause' },
      });
      expect(result.suggestedActions).toEqual([
        expect.objectContaining({
          type: 'use_existing',
          label: '选择其他规则',
        }),
      ]);
    });

    it('runs the real type validator and rejects an action mismatch', async () => {
      const pauseRule = createRule();
      exceptionRuleStorageMock.getRuleById.mockResolvedValue(pauseRule);

      const result = await enhancedRuleValidationService.preValidateRuleUsage(
        pauseRule.id,
        'early_completion',
      );

      expect(result).toMatchObject({
        isValid: false,
        errorType: ExceptionRuleError.RULE_TYPE_MISMATCH,
        errorMessage: '规则 "Focus rule" 是暂停类型，不能用于提前完成操作',
        debugInfo: {
          rule: pauseRule,
          actionType: 'early_completion',
          ruleTypeName: '暂停',
          actionName: '提前完成',
        },
      });
      expect(result.suggestedActions?.map(({ type }) => type)).toEqual([
        'create_new',
        'use_existing',
      ]);
    });

    it('accepts an active rule only when its type matches the action', async () => {
      const completionRule = createRule({
        type: ExceptionRuleType.EARLY_COMPLETION_ONLY,
      });
      exceptionRuleStorageMock.getRuleById.mockResolvedValue(completionRule);

      const result = await enhancedRuleValidationService.preValidateRuleUsage(
        completionRule.id,
        'early_completion',
      );

      expect(result).toEqual({
        isValid: true,
        debugInfo: {
          rule: completionRule,
          actionType: 'early_completion',
          match: true,
        },
      });
    });

    it('normalizes unknown storage failures without caching the transient error', async () => {
      const storageFailure = { message: 'storage unavailable' };
      exceptionRuleStorageMock.getRuleById
        .mockRejectedValueOnce(storageFailure)
        .mockResolvedValueOnce(createRule({ id: 'rule-io-failure' }));

      const result = await enhancedRuleValidationService.preValidateRuleUsage(
        'rule-io-failure',
        'pause',
      );

      expect(result).toMatchObject({
        isValid: false,
        errorType: ExceptionRuleError.STORAGE_ERROR,
        errorMessage: '预验证失败: storage unavailable',
        debugInfo: {
          ruleId: 'rule-io-failure',
          actionType: 'pause',
          error: storageFailure,
        },
      });

      const retryResult =
        await enhancedRuleValidationService.preValidateRuleUsage(
          'rule-io-failure',
          'pause',
        );

      expect(retryResult.isValid).toBe(true);
      expect(exceptionRuleStorageMock.getRuleById).toHaveBeenCalledTimes(2);
    });

    it('serves repeated rule/action validation from cache', async () => {
      const pauseRule = createRule();
      exceptionRuleStorageMock.getRuleById.mockResolvedValue(pauseRule);

      const first = await enhancedRuleValidationService.preValidateRuleUsage(
        pauseRule.id,
        'pause',
      );
      exceptionRuleStorageMock.getRuleById.mockRejectedValue(
        new Error('cache miss'),
      );
      const second = await enhancedRuleValidationService.preValidateRuleUsage(
        pauseRule.id,
        'pause',
      );

      expect(second).toEqual(first);
      expect(second.isValid).toBe(true);
      expect(exceptionRuleStorageMock.getRuleById).toHaveBeenCalledTimes(1);
    });

    it('keeps cache entries isolated by action type', async () => {
      const pauseRule = createRule();
      exceptionRuleStorageMock.getRuleById.mockResolvedValue(pauseRule);

      const pauseResult =
        await enhancedRuleValidationService.preValidateRuleUsage(
          pauseRule.id,
          'pause',
        );
      const completionResult =
        await enhancedRuleValidationService.preValidateRuleUsage(
          pauseRule.id,
          'early_completion',
        );

      expect(pauseResult.isValid).toBe(true);
      expect(completionResult).toMatchObject({
        isValid: false,
        errorType: ExceptionRuleError.RULE_TYPE_MISMATCH,
      });
      expect(exceptionRuleStorageMock.getRuleById).toHaveBeenCalledTimes(2);
      expect(exceptionRuleStorageMock.getRuleById).toHaveBeenNthCalledWith(
        1,
        pauseRule.id,
      );
      expect(exceptionRuleStorageMock.getRuleById).toHaveBeenNthCalledWith(
        2,
        pauseRule.id,
      );
    });

    it('re-reads storage after the validation cache is cleared', async () => {
      const activeRule = createRule();
      const inactiveRule = createRule({ isActive: false });
      exceptionRuleStorageMock.getRuleById
        .mockResolvedValueOnce(activeRule)
        .mockResolvedValueOnce(inactiveRule);

      const beforeClear =
        await enhancedRuleValidationService.preValidateRuleUsage(
          activeRule.id,
          'pause',
        );
      enhancedRuleValidationService.clearValidationCache();
      const afterClear =
        await enhancedRuleValidationService.preValidateRuleUsage(
          activeRule.id,
          'pause',
        );

      expect(beforeClear.isValid).toBe(true);
      expect(afterClear).toMatchObject({
        isValid: false,
        errorType: ExceptionRuleError.RULE_NOT_FOUND,
      });
      expect(exceptionRuleStorageMock.getRuleById).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateRulesIntegrity', () => {
    it('runs the real integrity validator over supplied rules', async () => {
      const validRule = createRule();
      const invalidRule = createRule({
        id: '',
        name: ' ',
        type: '' as ExceptionRuleType,
        createdAt: undefined as unknown as Date,
        usageCount: -1,
      });

      const report = await enhancedRuleValidationService.validateRulesIntegrity(
        [validRule, invalidRule],
      );

      expect(report).toMatchObject({
        totalRules: 2,
        validRules: 1,
        summary: '验证了 2 个规则，1 个有效，5 个问题',
      });
      expect(report.invalidRules).toHaveLength(5);
      expect(report.invalidRules.map(({ issue }) => issue)).toEqual([
        '缺少规则ID',
        '规则名称为空',
        '缺少规则类型',
        '缺少创建时间',
        '使用计数无效',
      ]);
      expect(exceptionRuleStorageMock.getRules).not.toHaveBeenCalled();
    });

    it('loads rules through the storage boundary when none are supplied', async () => {
      const storedRules = [
        createRule(),
        createRule({
          id: 'completion-rule',
          type: ExceptionRuleType.EARLY_COMPLETION_ONLY,
        }),
      ];
      exceptionRuleStorageMock.getRules.mockResolvedValue(storedRules);

      const report =
        await enhancedRuleValidationService.validateRulesIntegrity();

      expect(report).toEqual({
        totalRules: 2,
        validRules: 2,
        invalidRules: [],
        summary: '验证了 2 个规则，2 个有效，0 个问题',
      });
      expect(exceptionRuleStorageMock.getRules).toHaveBeenCalledTimes(1);
    });

    it('wraps integrity-storage failures as validation errors', async () => {
      exceptionRuleStorageMock.getRules.mockRejectedValue(
        new Error('rules table unavailable'),
      );

      const promise = enhancedRuleValidationService.validateRulesIntegrity();

      await expect(promise).rejects.toBeInstanceOf(ExceptionRuleException);
      await expect(promise).rejects.toMatchObject({
        type: ExceptionRuleError.VALIDATION_ERROR,
        message: '批量验证失败: rules table unavailable',
      });
    });
  });
});
