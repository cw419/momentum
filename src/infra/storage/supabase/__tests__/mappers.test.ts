import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chain } from '../../../../types';
import { buildChainRow, mapChainRowToChain } from '../mappers';

function createGroupChain(overrides: Partial<Chain> = {}): Chain {
  return {
    id: 'group-1',
    name: 'Group',
    type: 'group',
    sortOrder: 1,
    trigger: 'trigger',
    duration: 30,
    description: 'desc',
    currentStreak: 1,
    auxiliaryStreak: 0,
    totalCompletions: 2,
    totalFailures: 3,
    auxiliaryFailures: 0,
    exceptions: ['e1'],
    auxiliaryExceptions: ['a1'],
    auxiliarySignal: 'signal',
    auxiliaryDuration: 10,
    auxiliaryCompletionTrigger: 'complete',
    timeLimitExceptions: ['tl1'],
    createdAt: new Date('2026-02-06T00:00:00.000Z'),
    ...overrides,
  } as Chain;
}

describe('supabase/mappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('mapChainRowToChain', () => {
    it('maps group row and normalizes JSON arrays/dates', () => {
      const row = {
        id: 'group-1',
        name: 'Group',
        parent_id: 'parent-1',
        type: 'group',
        sort_order: 10,
        trigger: 'go',
        duration: 45,
        description: 'd',
        current_streak: 2,
        auxiliary_streak: 1,
        total_completions: 11,
        total_failures: 4,
        auxiliary_failures: 1,
        exceptions: ['a', 1, null],
        auxiliary_exceptions: ['b', { x: 1 }],
        auxiliary_signal: 'signal',
        auxiliary_duration: 15,
        auxiliary_completion_trigger: 'done',
        is_durationless: true,
        minimum_duration: 5,
        task_repeat_count: 3,
        time_limit_exceptions: ['x', 2],
        deleted_at: '2026-02-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        last_completed_at: '2026-02-02T00:00:00.000Z',
        time_limit_hours: 24,
        group_started_at: '2026-02-05T00:00:00.000Z',
        group_expires_at: '2026-02-06T00:00:00.000Z',
        is_task_group: true,
        group_repeat_count: 2,
      };

      const chain = mapChainRowToChain(row as never);

      expect(chain.type).toBe('group');
      expect(chain.parentId).toBe('parent-1');
      expect(chain.exceptions).toEqual(['a']);
      expect(chain.auxiliaryExceptions).toEqual(['b']);
      expect(chain.timeLimitExceptions).toEqual(['x']);
      expect(chain.deletedAt?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
      expect(chain.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(chain.lastCompletedAt?.toISOString()).toBe(
        '2026-02-02T00:00:00.000Z',
      );
      expect(
        (chain as Chain & { timeLimitHours?: number }).timeLimitHours,
      ).toBe(24);
    });

    it('maps non-group row and applies sensible defaults for missing fields', () => {
      const nowSpy = vi
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-02-06T12:00:00.000Z').getTime());
      expect(nowSpy).toBeDefined();

      const row = {
        id: 'unit-1',
        name: 'Unit',
        parent_id: null,
        type: null,
        sort_order: 1,
        trigger: 't',
        duration: 10,
        description: 'd',
        current_streak: 0,
        auxiliary_streak: 0,
        total_completions: 0,
        total_failures: 0,
        auxiliary_failures: 0,
        exceptions: null,
        auxiliary_exceptions: {},
        auxiliary_signal: '',
        auxiliary_duration: 5,
        auxiliary_completion_trigger: '',
        is_durationless: null,
        minimum_duration: null,
        task_repeat_count: null,
        time_limit_exceptions: null,
        deleted_at: null,
        created_at: null,
        last_completed_at: null,
      };

      const chain = mapChainRowToChain(row as never);

      expect(chain.type).toBe('unit');
      expect(chain.parentId).toBeUndefined();
      expect(chain.exceptions).toEqual([]);
      expect(chain.auxiliaryExceptions).toEqual([]);
      expect(chain.timeLimitExceptions).toEqual([]);
      expect(chain.deletedAt).toBeNull();
      expect(chain.createdAt).toBeInstanceOf(Date);
      expect(chain.lastCompletedAt).toBeUndefined();
    });
  });

  describe('buildChainRow', () => {
    it('sanitizes invalid values and omits new columns when includeNewColumns is false', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-06T12:00:00.000Z'));
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date('2026-02-06T12:00:00.000Z').getTime(),
      );

      const row = buildChainRow(
        {
          id: 123 as unknown as string,
          name: null as unknown as string,
          parentId: 123 as unknown as string,
          type: undefined as unknown as Chain['type'],
          sortOrder: Number.NaN as unknown as number,
          trigger: undefined as unknown as string,
          duration: Number.POSITIVE_INFINITY as unknown as number,
          description: undefined as unknown as string,
          currentStreak: Number.NaN as unknown as number,
          auxiliaryStreak: Number.NaN as unknown as number,
          totalCompletions: Number.NaN as unknown as number,
          totalFailures: Number.NaN as unknown as number,
          auxiliaryFailures: Number.NaN as unknown as number,
          exceptions: ['x', 1, null] as unknown as string[],
          auxiliaryExceptions: ['y', false] as unknown as string[],
          auxiliarySignal: undefined as unknown as string,
          auxiliaryDuration: Number.NaN as unknown as number,
          auxiliaryCompletionTrigger: undefined as unknown as string,
          createdAt: 'invalid-date' as unknown as Date,
          lastCompletedAt: 'also-invalid' as unknown as Date,
        } as Chain,
        'user-1',
        false,
      );

      expect(row.id).toBe('123');
      expect(row.name).toBe('');
      expect(row.parent_id).toBeNull();
      expect(row.type).toBe('unit');
      expect(row.sort_order).toBe(
        Math.floor(new Date('2026-02-06T12:00:00.000Z').getTime() / 1000),
      );
      expect(row.duration).toBe(45);
      expect(row.current_streak).toBe(0);
      expect(row.auxiliary_streak).toBe(0);
      expect(row.total_completions).toBe(0);
      expect(row.total_failures).toBe(0);
      expect(row.auxiliary_failures).toBe(0);
      expect(row.exceptions).toEqual(['x']);
      expect(row.auxiliary_exceptions).toEqual(['y']);
      expect(row.auxiliary_duration).toBe(15);
      expect(row.created_at).toBe('2026-02-06T12:00:00.000Z');
      expect(row.last_completed_at).toBeNull();

      expect('deleted_at' in row).toBe(false);
      expect('time_limit_hours' in row).toBe(false);
    });

    it('handles self-parent and sanitizes extended columns when includeNewColumns is true', () => {
      const row = buildChainRow(
        createGroupChain({
          id: 'same-id',
          parentId: 'same-id',
          isDurationless: 'yes' as unknown as boolean,
          minimumDuration: Number.NaN as unknown as number,
          isTaskGroup: 'wrong' as unknown as boolean,
          taskRepeatCount: Number.POSITIVE_INFINITY as unknown as number,
          groupRepeatCount: Number.NaN as unknown as number,
          timeLimitHours: Number.NaN as unknown as number,
          timeLimitExceptions: ['allowed', 2] as unknown as string[],
          groupStartedAt: 'bad-date' as unknown as Date,
          groupExpiresAt: new Date('2026-02-07T00:00:00.000Z'),
          deletedAt: 'bad-date' as unknown as Date,
        }),
        'user-2',
        true,
      );

      expect(row.parent_id).toBeNull();
      expect(row.is_durationless).toBe(false);
      expect(row.minimum_duration).toBe(0);
      expect(row.is_task_group).toBe(false);
      expect(row.task_repeat_count).toBe(0);
      expect(row.group_repeat_count).toBe(0);
      expect(row.time_limit_hours).toBe(0);
      expect(row.time_limit_exceptions).toEqual(['allowed']);
      expect(row.group_started_at).toBeNull();
      expect(row.group_expires_at).toBe('2026-02-07T00:00:00.000Z');
      expect(row.deleted_at).toBeNull();
    });
  });
});
