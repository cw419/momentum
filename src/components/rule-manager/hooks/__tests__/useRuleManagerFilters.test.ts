import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExceptionRuleType, type ExceptionRule } from '../../../../types';
import { useRuleManagerFilters } from '../useRuleManagerFilters';

function createRule(overrides: Partial<ExceptionRule> = {}): ExceptionRule {
  return {
    id: overrides.id ?? 'rule-1',
    name: overrides.name ?? 'Rule',
    description: overrides.description,
    type: overrides.type ?? ExceptionRuleType.PAUSE_ONLY,
    scope: overrides.scope ?? 'global',
    chainId: overrides.chainId,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    lastUsedAt: overrides.lastUsedAt,
    usageCount: overrides.usageCount ?? 0,
    isActive: overrides.isActive ?? true,
    isArchived: overrides.isArchived,
  };
}

describe('useRuleManagerFilters', () => {
  it('filters inactive rules and sorts by usage by default', () => {
    const rules = [
      createRule({ id: 'r1', name: 'Low', usageCount: 1 }),
      createRule({ id: 'r2', name: 'High', usageCount: 9 }),
      createRule({ id: 'r3', name: 'Inactive', usageCount: 100, isActive: false }),
    ];

    const { result } = renderHook(() => useRuleManagerFilters({ rules }));

    expect(result.current.filteredRules.map((rule) => rule.id)).toEqual(['r2', 'r1']);
  });

  it('applies type and search filters', () => {
    const rules = [
      createRule({
        id: 'pause',
        name: 'Pause Rule',
        type: ExceptionRuleType.PAUSE_ONLY,
        description: 'Stops timer',
      }),
      createRule({
        id: 'early',
        name: 'Early Complete',
        type: ExceptionRuleType.EARLY_COMPLETION_ONLY,
        description: 'Ends task early',
      }),
    ];

    const { result } = renderHook(() => useRuleManagerFilters({ rules }));

    act(() => {
      result.current.setTypeFilter(ExceptionRuleType.PAUSE_ONLY);
      result.current.setSearchQuery('timer');
    });

    expect(result.current.filteredRules).toHaveLength(1);
    expect(result.current.filteredRules[0]?.id).toBe('pause');
  });

  it('sorts by created date and last used date', () => {
    const rules = [
      createRule({
        id: 'older',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsedAt: new Date('2026-01-10T00:00:00.000Z'),
      }),
      createRule({
        id: 'newer',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        lastUsedAt: new Date('2026-02-10T00:00:00.000Z'),
      }),
      createRule({ id: 'never-used', createdAt: new Date('2026-01-15T00:00:00.000Z'), lastUsedAt: undefined }),
    ];

    const { result } = renderHook(() => useRuleManagerFilters({ rules }));

    act(() => {
      result.current.setSortBy('created');
    });
    expect(result.current.filteredRules.map((rule) => rule.id)).toEqual(['newer', 'never-used', 'older']);

    act(() => {
      result.current.setSortBy('lastUsed');
    });
    expect(result.current.filteredRules.map((rule) => rule.id)).toEqual(['newer', 'older', 'never-used']);
  });

  it('uses initialFilter when provided', () => {
    const rules = [
      createRule({ id: 'pause', type: ExceptionRuleType.PAUSE_ONLY }),
      createRule({ id: 'early', type: ExceptionRuleType.EARLY_COMPLETION_ONLY }),
    ];

    const { result } = renderHook(() =>
      useRuleManagerFilters({ rules, initialFilter: ExceptionRuleType.EARLY_COMPLETION_ONLY })
    );

    expect(result.current.typeFilter).toBe(ExceptionRuleType.EARLY_COMPLETION_ONLY);
    expect(result.current.filteredRules.map((rule) => rule.id)).toEqual(['early']);
  });
});
