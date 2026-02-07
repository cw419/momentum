import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExceptionRuleType, type ExceptionRule } from '../../../types';

const updateRuleMock = vi.hoisted(() => vi.fn());
const getUsageRecordsMock = vi.hoisted(() => vi.fn());
const updateUsageRecordMock = vi.hoisted(() => vi.fn());
const randomIdMock = vi.hoisted(() => vi.fn());

vi.mock('../../ExceptionRuleStorage', () => ({
  exceptionRuleStorage: {
    updateRule: updateRuleMock,
    getUsageRecords: getUsageRecordsMock,
    updateUsageRecord: updateUsageRecordMock,
  },
}));

vi.mock('../../../utils/random', () => ({
  randomId: randomIdMock,
}));

import { ruleIntegrityChecker } from '../RuleIntegrityChecker';

function createRule(overrides: Partial<ExceptionRule> = {}): ExceptionRule {
  return {
    id: overrides.id ?? 'rule-1',
    name: overrides.name ?? 'Rule 1',
    type: overrides.type ?? ExceptionRuleType.PAUSE_ONLY,
    scope: overrides.scope ?? 'global',
    chainId: overrides.chainId,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    lastUsedAt: overrides.lastUsedAt,
    usageCount: overrides.usageCount ?? 0,
    isActive: overrides.isActive ?? true,
    description: overrides.description,
    isArchived: overrides.isArchived,
  };
}

describe('integrity/RuleIntegrityChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    randomIdMock
      .mockReturnValueOnce('rule-generated-1')
      .mockReturnValueOnce('rule-generated-2')
      .mockReturnValueOnce('rule-generated-3')
      .mockReturnValue('rule-generated-fallback');
    getUsageRecordsMock.mockResolvedValue([
      { id: 'u1', ruleId: 'bad id', chainId: 'c1' },
      { id: 'u2', ruleId: 'duplicate-id', chainId: 'c2' },
      { id: 'u3', ruleId: 'other-id', chainId: 'c3' },
    ]);
  });

  it('detects missing/invalid/duplicate IDs and executes auto-fix actions', async () => {
    const rules = [
      createRule({ id: '' as unknown as string, name: 'Missing ID Rule' }),
      createRule({ id: 'bad id', name: 'Invalid ID Rule' }),
      createRule({ id: 'duplicate-id', name: 'Dup A' }),
      createRule({ id: 'duplicate-id', name: 'Dup B' }),
    ];

    const issues = ruleIntegrityChecker.validateRuleIds(rules);
    expect(issues).toHaveLength(3);
    expect(issues.map((issue) => issue.type)).toEqual(['missing_id', 'missing_id', 'missing_id']);

    for (const issue of issues) {
      await issue.fixAction?.();
    }

    expect(updateRuleMock).toHaveBeenCalled();
    expect(updateUsageRecordMock).toHaveBeenCalled();
    expect(rules[0].id).toBe('rule-generated-1');
    expect(rules[1].id).toBe('rule-generated-2');
    expect(rules[3].id).toBe('rule-generated-3');
  });

  it('detects duplicate active names and renames conflicting rules during auto-fix', async () => {
    const activeA = createRule({ id: 'a', name: 'Same Name', isActive: true });
    const activeB = createRule({ id: 'b', name: ' same name ', isActive: true });
    const inactive = createRule({ id: 'c', name: 'Same Name', isActive: false });

    const issues = ruleIntegrityChecker.checkDuplicateNames([activeA, activeB, inactive]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.type).toBe('duplicate_name');
    expect(issues[0]?.affectedItems).toEqual(['a', 'b']);

    await issues[0]?.fixAction?.();

    expect(activeB.name).toBe(' same name  (2)');
    expect(updateRuleMock).toHaveBeenCalledWith('b', activeB);
  });

  it('detects invalid fields and applies available auto-fixes', async () => {
    const missingFieldsRule = createRule({
      id: 'missing-fields',
      name: ' ',
      usageCount: -3,
    });
    (missingFieldsRule as { type?: ExceptionRuleType }).type = undefined;
    (missingFieldsRule as { createdAt?: Date }).createdAt = undefined;

    const invalidTypeRule = createRule({
      id: 'invalid-type',
      name: 'Invalid Type',
      type: 'not_a_real_type' as unknown as ExceptionRuleType,
    });

    const issues = ruleIntegrityChecker.checkRuleFields([missingFieldsRule, invalidTypeRule]);

    expect(issues.map((issue) => issue.type)).toEqual([
      'invalid_type',
      'invalid_type',
      'missing_created_at',
      'invalid_usage_count',
      'invalid_type',
    ]);

    const autoFixableIssues = issues.filter((issue) => issue.autoFixable);
    for (const issue of autoFixableIssues) {
      await issue.fixAction?.();
    }

    expect(missingFieldsRule.type).toBe(ExceptionRuleType.PAUSE_ONLY);
    expect(missingFieldsRule.createdAt).toBeInstanceOf(Date);
    expect(missingFieldsRule.usageCount).toBe(0);
    expect(invalidTypeRule.type).toBe(ExceptionRuleType.PAUSE_ONLY);
    expect(updateRuleMock).toHaveBeenCalled();
  });
});
