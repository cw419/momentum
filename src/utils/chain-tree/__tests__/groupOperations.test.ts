import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGroupChain, createUnitChain } from '../../../test/factories';
import {
  incrementGroupCompletionCount,
  resetGroupCompletionCount,
} from '../groupOperations';

describe('chain-tree/groupOperations', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('increments group completion and resets descendant unit progress', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-08T12:00:00.000Z'));

    const rootGroup = createGroupChain({
      id: 'group-root',
      parentId: undefined,
      currentStreak: 3,
      totalCompletions: 10,
    });
    const nestedGroup = createGroupChain({
      id: 'group-nested',
      parentId: rootGroup.id,
      currentStreak: 2,
    });
    const unitA = createUnitChain({
      id: 'unit-a',
      parentId: rootGroup.id,
      currentStreak: 4,
    });
    const unitB = createUnitChain({
      id: 'unit-b',
      parentId: nestedGroup.id,
      currentStreak: 7,
    });
    const outsider = createUnitChain({
      id: 'unit-out',
      parentId: undefined,
      currentStreak: 9,
    });

    const updated = incrementGroupCompletionCount(
      [rootGroup, nestedGroup, unitA, unitB, outsider],
      rootGroup.id,
    );

    const rootAfter = updated.find((chain) => chain.id === rootGroup.id);
    expect(rootAfter).toMatchObject({
      currentStreak: 4,
      totalCompletions: 11,
    });
    expect(rootAfter?.lastCompletedAt).toBeInstanceOf(Date);

    expect(updated.find((chain) => chain.id === unitA.id)?.currentStreak).toBe(
      0,
    );
    expect(updated.find((chain) => chain.id === unitB.id)?.currentStreak).toBe(
      0,
    );
    expect(
      updated.find((chain) => chain.id === nestedGroup.id)?.currentStreak,
    ).toBe(2);
    expect(
      updated.find((chain) => chain.id === outsider.id)?.currentStreak,
    ).toBe(9);
  });

  it('returns chains unchanged when target is not a group', () => {
    const unit = createUnitChain({
      id: 'unit-root',
      parentId: undefined,
      currentStreak: 2,
    });
    const updated = incrementGroupCompletionCount([unit], unit.id);
    expect(updated).toEqual([unit]);
  });

  it('resets group completion count and increments failures', () => {
    const group = createGroupChain({
      id: 'group-1',
      currentStreak: 5,
      totalFailures: 3,
    });
    const unit = createUnitChain({
      id: 'unit-1',
      currentStreak: 4,
      totalFailures: 1,
    });

    const updated = resetGroupCompletionCount([group, unit], group.id);
    expect(updated.find((chain) => chain.id === group.id)).toMatchObject({
      currentStreak: 0,
      totalFailures: 4,
    });
    expect(updated.find((chain) => chain.id === unit.id)).toMatchObject({
      currentStreak: 4,
      totalFailures: 1,
    });
  });
});
