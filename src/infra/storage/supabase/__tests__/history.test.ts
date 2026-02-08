import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCompletionHistory, saveCompletionHistory } from '../history';
import {
  createMockContext,
  createMockQueryBuilder,
  createSupabaseError,
} from '../testHelpers';
import type { CompletionHistory } from '../../../../types';

vi.mock('../../../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    dbOperation: vi.fn(),
  },
}));

const createMockHistoryRow = (
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  id: 'history-1',
  chain_id: 'chain-1',
  completed_at: '2024-01-15T10:00:00Z',
  duration: 30,
  was_successful: true,
  reason_for_failure: null,
  actual_duration: 28,
  is_forward_timed: false,
  description: 'Completed task',
  notes: 'Good progress',
  user_id: 'test-user-123',
  ...overrides,
});

describe('history.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCompletionHistory', () => {
    it('should return empty array when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await getCompletionHistory(ctx);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: createSupabaseError('UNKNOWN', 'Database error'),
      });
      const ctx = createMockContext({ queryBuilder });

      const result = await getCompletionHistory(ctx);

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      const queryBuilder = createMockQueryBuilder({ data: null, error: null });
      const ctx = createMockContext({ queryBuilder });

      const result = await getCompletionHistory(ctx);

      expect(result).toEqual([]);
    });

    it('should return mapped completion history on success', async () => {
      const mockData = [createMockHistoryRow()];
      const queryBuilder = createMockQueryBuilder({
        data: mockData,
        error: null,
      });
      const ctx = createMockContext({ queryBuilder });

      const result = await getCompletionHistory(ctx);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe('chain-1');
      expect(result[0].duration).toBe(30);
      expect(result[0].wasSuccessful).toBe(true);
      expect(result[0].actualDuration).toBe(28);
      expect(result[0].isForwardTimed).toBe(false);
      expect(result[0].description).toBe('Completed task');
      expect(result[0].notes).toBe('Good progress');
      expect(result[0].completedAt).toBeInstanceOf(Date);
    });

    it('should handle failure records correctly', async () => {
      const mockData = [
        createMockHistoryRow({
          was_successful: false,
          reason_for_failure: 'Got distracted',
        }),
      ];
      const queryBuilder = createMockQueryBuilder({
        data: mockData,
        error: null,
      });
      const ctx = createMockContext({ queryBuilder });

      const result = await getCompletionHistory(ctx);

      expect(result[0].wasSuccessful).toBe(false);
      expect(result[0].reasonForFailure).toBe('Got distracted');
    });

    it('should handle forward timed records', async () => {
      const mockData = [
        createMockHistoryRow({
          is_forward_timed: true,
          actual_duration: 45,
        }),
      ];
      const queryBuilder = createMockQueryBuilder({
        data: mockData,
        error: null,
      });
      const ctx = createMockContext({ queryBuilder });

      const result = await getCompletionHistory(ctx);

      expect(result[0].isForwardTimed).toBe(true);
      expect(result[0].actualDuration).toBe(45);
    });

    it('should use duration as fallback for actual_duration when null', async () => {
      const mockData = [
        createMockHistoryRow({
          actual_duration: null,
          duration: 30,
        }),
      ];
      const queryBuilder = createMockQueryBuilder({
        data: mockData,
        error: null,
      });
      const ctx = createMockContext({ queryBuilder });

      const result = await getCompletionHistory(ctx);

      expect(result[0].actualDuration).toBe(30);
    });

    it('should handle missing optional fields', async () => {
      const mockData = [
        createMockHistoryRow({
          reason_for_failure: null,
          description: null,
          notes: null,
        }),
      ];
      const queryBuilder = createMockQueryBuilder({
        data: mockData,
        error: null,
      });
      const ctx = createMockContext({ queryBuilder });

      const result = await getCompletionHistory(ctx);

      expect(result[0].reasonForFailure).toBeUndefined();
      expect(result[0].description).toBeUndefined();
      expect(result[0].notes).toBeUndefined();
    });
  });

  describe('saveCompletionHistory', () => {
    it('should return early when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });
      const history: CompletionHistory[] = [
        {
          chainId: 'chain-1',
          completedAt: new Date(),
          duration: 30,
          wasSuccessful: true,
        },
      ];

      await saveCompletionHistory(ctx, history);

      expect(ctx.mockClient.from).not.toHaveBeenCalled();
    });

    it('should return early when history is empty', async () => {
      const ctx = createMockContext();

      await saveCompletionHistory(ctx, []);

      expect(ctx.mockClient.from).not.toHaveBeenCalled();
    });

    it('should upsert mapped rows with conflict target', async () => {
      const ctx = createMockContext();
      let upsertedData: unknown[] = [];
      let upsertOptions: unknown = null;

      ctx.mockClient.from = vi.fn().mockReturnValue({
        upsert: vi
          .fn()
          .mockImplementation((data: unknown[], options: unknown) => {
            upsertedData = data;
            upsertOptions = options;
            return { data: null, error: null };
          }),
      });

      const history: CompletionHistory[] = [
        {
          chainId: 'chain-1',
          completedAt: new Date('2024-01-15T10:00:00.000Z'),
          duration: 30,
          wasSuccessful: false,
          reasonForFailure: 'Interrupted',
          actualDuration: 15,
          isForwardTimed: true,
          description: 'Task description',
          notes: 'Some notes',
        },
      ];

      await saveCompletionHistory(ctx, history);

      expect(upsertOptions).toEqual({
        onConflict: 'user_id,chain_id,completed_at',
        ignoreDuplicates: true,
      });
      expect(upsertedData).toHaveLength(1);
      const record = upsertedData[0] as Record<string, unknown>;
      expect(record.chain_id).toBe('chain-1');
      expect(record.user_id).toBe('test-user-123');
      expect(record.duration).toBe(30);
      expect(record.was_successful).toBe(false);
      expect(record.reason_for_failure).toBe('Interrupted');
      expect(record.actual_duration).toBe(15);
      expect(record.is_forward_timed).toBe(true);
      expect(record.description).toBe('Task description');
      expect(record.notes).toBe('Some notes');
    });

    it('should fallback to basic fields when timing columns are missing', async () => {
      const ctx = createMockContext();
      let callCount = 0;
      let secondCallRow: Record<string, unknown> | null = null;
      ctx.mockClient.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockImplementation((data: unknown[]) => {
          callCount++;
          if (callCount === 1) {
            return {
              data: null,
              error: createSupabaseError(
                '42703',
                'actual_duration does not exist',
              ),
            };
          }
          secondCallRow = data[0] as Record<string, unknown>;
          return { data: null, error: null };
        }),
      });

      const history: CompletionHistory[] = [
        {
          chainId: 'chain-1',
          completedAt: new Date('2024-01-15T10:00:00.000Z'),
          duration: 30,
          wasSuccessful: true,
          actualDuration: 28,
          isForwardTimed: true,
        },
      ];

      await saveCompletionHistory(ctx, history);

      expect(callCount).toBe(2);
      expect(secondCallRow).not.toBeNull();
      expect('actual_duration' in (secondCallRow || {})).toBe(false);
      expect('is_forward_timed' in (secondCallRow || {})).toBe(false);
    });

    it('should fall back to legacy insert when unique index is missing', async () => {
      const ctx = createMockContext();
      let insertCalled = false;
      const upsert = vi.fn().mockReturnValue({
        data: null,
        error: createSupabaseError(
          '42P10',
          'no unique or exclusion constraint matching',
        ),
      });
      const selectEq = vi.fn().mockReturnValue({ data: [], error: null });
      const insert = vi.fn().mockImplementation(() => {
        insertCalled = true;
        return { data: null, error: null };
      });

      ctx.mockClient.from = vi.fn().mockReturnValue({
        upsert,
        select: vi.fn().mockReturnValue({ eq: selectEq }),
        insert,
      });

      const history: CompletionHistory[] = [
        {
          chainId: 'chain-1',
          completedAt: new Date('2024-01-15T10:00:00.000Z'),
          duration: 30,
          wasSuccessful: false,
          reasonForFailure: 'Interrupted',
          actualDuration: 15,
          isForwardTimed: true,
          description: 'Task description',
          notes: 'Some notes',
        },
      ];

      await saveCompletionHistory(ctx, history);

      expect(upsert).toHaveBeenCalled();
      expect(selectEq).toHaveBeenCalledWith('user_id', 'test-user-123');
      expect(insertCalled).toBe(true);
    });

    it('should map null optional fields', async () => {
      const ctx = createMockContext();
      let upsertedData: unknown[] = [];
      ctx.mockClient.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockImplementation((data: unknown[]) => {
          upsertedData = data;
          return { data: null, error: null };
        }),
      });

      const history: CompletionHistory[] = [
        {
          chainId: 'chain-1',
          completedAt: new Date('2024-01-15T10:00:00.000Z'),
          duration: 30,
          wasSuccessful: true,
        },
      ];

      await saveCompletionHistory(ctx, history);

      const record = upsertedData[0] as Record<string, unknown>;
      expect(record.description).toBeNull();
      expect(record.notes).toBeNull();
      expect(record.reason_for_failure).toBeNull();
    });
  });
});
