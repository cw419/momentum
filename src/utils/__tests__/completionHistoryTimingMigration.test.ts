import { describe, expect, test } from 'vitest';
import type { Chain, CompletionHistory } from '../../types';
import { migrateCompletionHistoryForTiming } from '../completionHistoryTimingMigration';

describe('migrateCompletionHistoryForTiming', () => {
  test('adds timing fields when missing', () => {
    const history = [
      {
        chainId: 'c1',
        completedAt: new Date(),
        duration: 30,
        wasSuccessful: true,
      },
    ] as CompletionHistory[];

    const chains = [{ id: 'c1', isDurationless: true } as Chain];

    const result = migrateCompletionHistoryForTiming(history, chains);
    expect(result.hasChanges).toBe(true);
    expect(result.updatedHistory[0]).toMatchObject({
      chainId: 'c1',
      actualDuration: 30,
      isForwardTimed: true,
    });
  });

  test('does not modify records that already have timing fields', () => {
    const history = [
      {
        chainId: 'c1',
        completedAt: new Date(),
        duration: 30,
        wasSuccessful: true,
        actualDuration: 25,
        isForwardTimed: false,
      },
    ] as CompletionHistory[];

    const result = migrateCompletionHistoryForTiming(history, []);
    expect(result.hasChanges).toBe(false);
    expect(result.updatedHistory[0].actualDuration).toBe(25);
    expect(result.updatedHistory[0].isForwardTimed).toBe(false);
  });
});
