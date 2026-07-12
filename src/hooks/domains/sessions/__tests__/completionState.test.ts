import { describe, expect, it } from 'vitest';
import { createUnitChain } from '../../../../test/factories';
import {
  updateChainsForFailure,
  updateChainsForSuccess,
} from '../completionState';

describe('completionState', () => {
  it('applies successful completion counters without mutating input', () => {
    const chain = createUnitChain({
      id: 'chain-1',
      currentStreak: 2,
      totalCompletions: 4,
    });
    const completedAt = new Date('2026-01-01T00:00:00Z');
    const result = updateChainsForSuccess([chain], chain.id, completedAt);

    expect(result[0]).toMatchObject({
      currentStreak: 3,
      totalCompletions: 5,
      lastCompletedAt: completedAt,
    });
    expect(chain.currentStreak).toBe(2);
  });

  it('resets streak and increments failures on interruption', () => {
    const chain = createUnitChain({
      id: 'chain-1',
      currentStreak: 2,
      totalFailures: 1,
    });
    expect(updateChainsForFailure([chain], chain.id)[0]).toMatchObject({
      currentStreak: 0,
      totalFailures: 2,
    });
  });
});
