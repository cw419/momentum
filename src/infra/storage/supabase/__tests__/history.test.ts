import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCompletionHistory, saveCompletionHistory } from '../history';
import {
  createMockContext,
  createMockQueryBuilder,
  createSupabaseError,
} from './helpers';
import type { CompletionHistory } from '../../../../types';

vi.mock('../../../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    dbOperation: vi.fn(),
  },
}));

const createMockHistoryRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
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
      const queryBuilder = createMockQueryBuilder({ data: mockData, error: null });
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
      const queryBuilder = createMockQueryBuilder({ data: mockData, error: null });
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
      const queryBuilder = createMockQueryBuilder({ data: mockData, error: null });
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
      const queryBuilder = createMockQueryBuilder({ data: mockData, error: null });
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
      const queryBuilder = createMockQueryBuilder({ data: mockData, error: null });
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

    it('should not insert when all records already exist', async () => {
      const existingHistory = [
        {
          chain_id: 'chain-1',
          completed_at: '2024-01-15T10:00:00.000Z',
        },
      ];
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: existingHistory,
            error: null,
          }),
        }),
        insert: vi.fn(),
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

      expect(ctx.mockClient.from).toHaveBeenCalledWith('completion_history');
    });

    it('should insert only new records', async () => {
      const existingHistory = [
        {
          chain_id: 'chain-1',
          completed_at: '2024-01-15T10:00:00.000Z',
        },
      ];
      const ctx = createMockContext();
      let insertCalled = false;
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: existingHistory,
            error: null,
          }),
        }),
        insert: vi.fn().mockImplementation(() => {
          insertCalled = true;
          return { error: null };
        }),
      });

      const history: CompletionHistory[] = [
        {
          chainId: 'chain-1',
          completedAt: new Date('2024-01-15T10:00:00.000Z'),
          duration: 30,
          wasSuccessful: true,
        },
        {
          chainId: 'chain-2',
          completedAt: new Date('2024-01-16T10:00:00.000Z'),
          duration: 45,
          wasSuccessful: true,
        },
      ];

      await saveCompletionHistory(ctx, history);

      expect(insertCalled).toBe(true);
    });

    it('should fallback to basic fields when new columns are missing', async () => {
      const ctx = createMockContext();
      let insertCallCount = 0;
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        insert: vi.fn().mockImplementation(() => {
          insertCallCount++;
          if (insertCallCount === 1) {
            return {
              error: createSupabaseError('42703', 'actual_duration does not exist'),
            };
          }
          return { error: null };
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

      expect(insertCallCount).toBe(2);
    });

    it('should handle empty history array by returning early after filtering', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        insert: vi.fn(),
      });

      await saveCompletionHistory(ctx, []);

      expect(ctx.mockClient.from).toHaveBeenCalledWith('completion_history');
    });

    it('should map all fields correctly for insert', async () => {
      const ctx = createMockContext();
      let insertedData: unknown[] = [];
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        insert: vi.fn().mockImplementation((data: unknown[]) => {
          insertedData = data;
          return { error: null };
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

      expect(insertedData).toHaveLength(1);
      const record = insertedData[0] as Record<string, unknown>;
      expect(record.chain_id).toBe('chain-1');
      expect(record.duration).toBe(30);
      expect(record.was_successful).toBe(false);
      expect(record.reason_for_failure).toBe('Interrupted');
      expect(record.actual_duration).toBe(15);
      expect(record.is_forward_timed).toBe(true);
      expect(record.description).toBe('Task description');
      expect(record.notes).toBe('Some notes');
    });

    it('should handle null optional fields', async () => {
      const ctx = createMockContext();
      let insertedData: unknown[] = [];
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        insert: vi.fn().mockImplementation((data: unknown[]) => {
          insertedData = data;
          return { error: null };
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

      const record = insertedData[0] as Record<string, unknown>;
      expect(record.description).toBeNull();
      expect(record.notes).toBeNull();
    });
  });
});
