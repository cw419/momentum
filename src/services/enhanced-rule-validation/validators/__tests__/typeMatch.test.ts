import { describe, expect, it } from 'vitest';
import {
  ExceptionRuleError,
  ExceptionRuleType,
  type ExceptionRule,
} from '../../../../types';
import type { ActionType } from '../../types';
import { validateRuleTypeForAction } from '../typeMatch';

function createRule(overrides: Partial<ExceptionRule> = {}): ExceptionRule {
  return {
    id: 'rule-1',
    name: 'Test rule',
    type: ExceptionRuleType.PAUSE_ONLY,
    scope: 'global',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    usageCount: 0,
    isActive: true,
    ...overrides,
  };
}

describe('validateRuleTypeForAction', () => {
  it('returns RULE_NOT_FOUND when rule is missing', () => {
    const result = validateRuleTypeForAction(
      null as unknown as ExceptionRule,
      'pause',
    );

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe(ExceptionRuleError.RULE_NOT_FOUND);
  });

  it('returns INVALID_RULE_TYPE when rule type is missing', () => {
    const result = validateRuleTypeForAction(
      createRule({ type: '' as never }),
      'pause',
    );

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe(ExceptionRuleError.INVALID_RULE_TYPE);
    expect(result.suggestedActions).toHaveLength(1);
    expect(result.errorMessage).toBe('规则 "Test rule" 缺少类型定义');
    expect(result.suggestedActions?.[0]).toEqual(
      expect.objectContaining({
        type: 'fix_data',
        label: '修复规则类型',
        description: '为规则设置正确的类型',
      }),
    );
  });

  it('returns INVALID_RULE_TYPE when rule type is not in enum', () => {
    const result = validateRuleTypeForAction(
      createRule({ type: 'bad-type' as never }),
      'pause',
    );

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe(ExceptionRuleError.INVALID_RULE_TYPE);
    expect(result.errorMessage).toBe('规则 "Test rule" 的类型 "bad-type" 无效');
    expect(result.debugInfo).toEqual(
      expect.objectContaining({
        validTypes: expect.arrayContaining([
          ExceptionRuleType.PAUSE_ONLY,
          ExceptionRuleType.EARLY_COMPLETION_ONLY,
        ]),
      }),
    );
  });

  it('returns VALIDATION_ERROR for invalid action type', () => {
    const result = validateRuleTypeForAction(
      createRule(),
      'invalid' as ActionType,
    );

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe(ExceptionRuleError.VALIDATION_ERROR);
    expect(result.errorMessage).toBe('操作类型 "invalid" 无效');
    expect(result.debugInfo).toEqual(
      expect.objectContaining({
        validActions: ['pause', 'early_completion'],
      }),
    );
  });

  it('returns mismatch result and executable suggested actions for non-matching type', async () => {
    const result = validateRuleTypeForAction(
      createRule({ type: ExceptionRuleType.PAUSE_ONLY }),
      'early_completion',
    );

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe(ExceptionRuleError.RULE_TYPE_MISMATCH);
    expect(result.suggestedActions).toHaveLength(2);
    expect(result.errorMessage).toBe(
      '规则 "Test rule" 是暂停类型，不能用于提前完成操作',
    );
    expect(result.suggestedActions?.[0]).toEqual(
      expect.objectContaining({
        type: 'create_new',
        label: '创建提前完成规则',
        description: '创建一个新的提前完成类型规则',
      }),
    );
    expect(result.suggestedActions?.[1]).toEqual(
      expect.objectContaining({
        type: 'use_existing',
        label: '选择提前完成规则',
        description: '从现有的提前完成规则中选择',
      }),
    );

    for (const action of result.suggestedActions ?? []) {
      await expect(action.handler()).resolves.toBeUndefined();
    }
  });

  it('returns pause-side mismatch message and actions when early-completion rule is used for pause', () => {
    const result = validateRuleTypeForAction(
      createRule({ type: ExceptionRuleType.EARLY_COMPLETION_ONLY }),
      'pause',
    );

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe(ExceptionRuleError.RULE_TYPE_MISMATCH);
    expect(result.errorMessage).toBe(
      '规则 "Test rule" 是提前完成类型，不能用于暂停操作',
    );
    expect(result.suggestedActions).toEqual([
      expect.objectContaining({
        type: 'create_new',
        label: '创建暂停规则',
        description: '创建一个新的暂停类型规则',
      }),
      expect.objectContaining({
        type: 'use_existing',
        label: '选择暂停规则',
        description: '从现有的暂停规则中选择',
      }),
    ]);
    expect(result.debugInfo).toEqual(
      expect.objectContaining({
        ruleTypeName: '提前完成',
        actionName: '暂停',
      }),
    );
  });

  it('returns valid result when rule type matches action', () => {
    const result = validateRuleTypeForAction(
      createRule({ type: ExceptionRuleType.EARLY_COMPLETION_ONLY }),
      'early_completion',
    );

    expect(result).toEqual(
      expect.objectContaining({
        isValid: true,
        debugInfo: expect.objectContaining({ match: true }),
      }),
    );
  });

  it('returns valid result for pause action with pause-only rule', () => {
    const result = validateRuleTypeForAction(
      createRule({ type: ExceptionRuleType.PAUSE_ONLY }),
      'pause',
    );

    expect(result).toEqual(
      expect.objectContaining({
        isValid: true,
        debugInfo: expect.objectContaining({ match: true }),
      }),
    );
  });

  it('falls back to VALIDATION_ERROR when validation throws unexpectedly', () => {
    const brokenRule = createRule();
    Object.defineProperty(brokenRule, 'type', {
      get: () => {
        throw new Error('boom');
      },
    });

    const result = validateRuleTypeForAction(brokenRule, 'pause');

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe(ExceptionRuleError.VALIDATION_ERROR);
    expect(result.errorMessage).toContain('boom');
  });
});
