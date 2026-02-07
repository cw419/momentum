import { describe, expect, it } from 'vitest';
import { ExceptionRuleError } from '../../../types';
import type { RecoveryStrategy } from '../RecoveryStrategy';
import { RecoveryStrategyRegistry } from '../RecoveryStrategy';

function makeStrategy(errorType: ExceptionRuleError, priority: number, label: string): RecoveryStrategy {
  return {
    errorType,
    strategy: 'fallback',
    priority,
    handler: async () => ({
      success: true,
      message: label,
    }),
  };
}

describe('recovery/RecoveryStrategyRegistry', () => {
  it('registers strategies and keeps them sorted by priority descending', () => {
    const registry = new RecoveryStrategyRegistry();
    const low = makeStrategy(ExceptionRuleError.STORAGE_ERROR, 1, 'low');
    const high = makeStrategy(ExceptionRuleError.STORAGE_ERROR, 10, 'high');
    const mid = makeStrategy(ExceptionRuleError.STORAGE_ERROR, 5, 'mid');

    registry.registerStrategy(low);
    registry.registerStrategy(high);
    registry.registerStrategy(mid);

    const strategies = registry.getStrategies(ExceptionRuleError.STORAGE_ERROR);
    expect(strategies).toHaveLength(3);
    expect(strategies.map((s) => s.priority)).toEqual([10, 5, 1]);
  });

  it('returns empty list and false when no strategies exist', () => {
    const registry = new RecoveryStrategyRegistry();

    expect(registry.getStrategies(ExceptionRuleError.NETWORK_ERROR)).toEqual([]);
    expect(registry.hasStrategies(ExceptionRuleError.NETWORK_ERROR)).toBe(false);
  });

  it('treats an empty bucket as no strategies and supports clear', () => {
    const registry = new RecoveryStrategyRegistry();
    registry.registerStrategy(makeStrategy(ExceptionRuleError.VALIDATION_ERROR, 2, 'x'));
    expect(registry.hasStrategies(ExceptionRuleError.VALIDATION_ERROR)).toBe(true);

    (registry as unknown as { strategies: Map<ExceptionRuleError, RecoveryStrategy[]> }).strategies.set(
      ExceptionRuleError.VALIDATION_ERROR,
      []
    );
    expect(registry.hasStrategies(ExceptionRuleError.VALIDATION_ERROR)).toBe(false);

    registry.clear();
    expect(registry.getStrategies(ExceptionRuleError.VALIDATION_ERROR)).toEqual([]);
    expect(registry.hasStrategies(ExceptionRuleError.VALIDATION_ERROR)).toBe(false);
  });
});

