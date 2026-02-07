import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExceptionRuleType } from '../../../types';
import { fixRuleTypeIssues } from '../ruleTypeFixer';

const storageMock = vi.hoisted(() => ({
  getRuleById: vi.fn(),
  updateRule: vi.fn(),
}));

vi.mock('../../ExceptionRuleStorage', () => ({
  exceptionRuleStorage: storageMock,
}));

describe('fixRuleTypeIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not-found issue when rule is missing', async () => {
    storageMock.getRuleById.mockResolvedValue(null);

    const result = await fixRuleTypeIssues('missing');

    expect(result.fixed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(storageMock.updateRule).not.toHaveBeenCalled();
  });

  it('repairs invalid type, missing createdAt and invalid usageCount', async () => {
    storageMock.getRuleById.mockResolvedValue({
      id: 'rule-1',
      name: 'Rule',
      type: 'bad-type',
      createdAt: null,
      usageCount: -1,
    });

    const result = await fixRuleTypeIssues('rule-1');

    expect(result.fixed).toBe(true);
    expect(result.issues.some((item) => item.includes('type'))).toBe(true);
    expect(storageMock.updateRule).toHaveBeenCalledWith('rule-1', { type: ExceptionRuleType.PAUSE_ONLY });
    expect(storageMock.updateRule).toHaveBeenCalledWith('rule-1', { usageCount: 0 });
  });

  it('repairs missing type and reports empty name issue without failing', async () => {
    storageMock.getRuleById.mockResolvedValue({
      id: 'rule-2',
      name: '   ',
      type: undefined,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      usageCount: 0,
    });

    const result = await fixRuleTypeIssues('rule-2');

    expect(result.fixed).toBe(true);
    expect(result.issues.length).toBeGreaterThan(1);
    expect(storageMock.updateRule).toHaveBeenCalledWith('rule-2', { type: ExceptionRuleType.PAUSE_ONLY });
  });

  it('returns failure result when storage throws', async () => {
    storageMock.getRuleById.mockRejectedValue(new Error('boom'));

    const result = await fixRuleTypeIssues('rule-3');

    expect(result.fixed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.actions.length).toBeGreaterThan(0);
  });
});
