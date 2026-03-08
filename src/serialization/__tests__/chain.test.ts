import { describe, expect, it } from 'vitest';
import { decodeChain } from '../chain';

describe('serialization/chain', () => {
  it('decodes unit chains with legacy defaults', () => {
    const chain = decodeChain({
      id: 'unit-1',
      name: 'Unit',
      type: 'unit',
      sortOrder: 1,
      trigger: 'go',
      duration: 20,
      description: 'desc',
      currentStreak: 1,
      totalCompletions: 2,
      totalFailures: 3,
      exceptions: ['a'],
      auxiliarySignal: 'signal',
      auxiliaryDuration: 10,
      auxiliaryCompletionTrigger: 'done',
      createdAt: '2026-02-01T00:00:00.000Z',
      deletedAt: null,
      timeLimitExceptions: ['x'],
    });

    expect(chain.type).toBe('unit');
    expect(chain.createdAt).toBeInstanceOf(Date);
    expect(chain.auxiliaryStreak).toBe(0);
    expect(chain.auxiliaryFailures).toBe(0);
    expect(chain.auxiliaryExceptions).toEqual([]);
    expect(chain.deletedAt).toBeNull();
  });

  it('decodes group chains and preserves group-only fields', () => {
    const chain = decodeChain({
      id: 'group-1',
      name: 'Group',
      type: 'group',
      sortOrder: 1,
      trigger: 'go',
      duration: 20,
      description: 'desc',
      currentStreak: 1,
      auxiliaryStreak: 2,
      totalCompletions: 2,
      totalFailures: 3,
      auxiliaryFailures: 1,
      exceptions: ['a'],
      auxiliaryExceptions: ['b'],
      auxiliarySignal: 'signal',
      auxiliaryDuration: 10,
      auxiliaryCompletionTrigger: 'done',
      createdAt: '2026-02-01T00:00:00.000Z',
      deletedAt: null,
      timeLimitExceptions: ['x'],
      timeLimitHours: 24,
      groupStartedAt: '2026-02-02T00:00:00.000Z',
      groupExpiresAt: '2026-02-03T00:00:00.000Z',
      isTaskGroup: true,
      groupRepeatCount: 3,
      taskRepeatCount: 2,
    });

    expect(chain.type).toBe('group');
    expect(chain.groupStartedAt).toBeInstanceOf(Date);
    expect(chain.groupExpiresAt).toBeInstanceOf(Date);
    expect(chain.groupRepeatCount).toBe(3);
  });
});
