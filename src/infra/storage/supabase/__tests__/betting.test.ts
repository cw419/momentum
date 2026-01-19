import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBettingSession,
  deleteBettingSession,
  completeTaskWithBetting,
  placeBet,
  getUserAvailablePoints,
  getTodayBetAmount,
} from '../betting';
import {
  createMockContext,
  createMockQueryBuilder,
  createSupabaseError,
} from './helpers';
import type { BetPlacementRequest } from '../../../../domain/betting';

vi.mock('../../../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    dbOperation: vi.fn(),
  },
}));

describe('betting.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBettingSession', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await createBettingSession(ctx, 'chain-1', 30);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_AUTHENTICATED');
      }
    });

    it('should return session id on success', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: { id: 'session-123' },
              error: null,
            }),
          }),
        }),
      });

      const result = await createBettingSession(ctx, 'chain-1', 30);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('session-123');
      }
    });

    it('should return error when insert fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('UNKNOWN', 'Insert failed'),
            }),
          }),
        }),
      });

      const result = await createBettingSession(ctx, 'chain-1', 30);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('STORAGE');
      }
    });

    it('should return error when id is missing from response', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: {},
              error: null,
            }),
          }),
        }),
      });

      const result = await createBettingSession(ctx, 'chain-1', 30);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('missing id');
      }
    });

    it('should handle exceptions gracefully', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await createBettingSession(ctx, 'chain-1', 30);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  describe('deleteBettingSession', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await deleteBettingSession(ctx, 'session-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_AUTHENTICATED');
      }
    });

    it('should return success when delete succeeds', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              error: null,
            }),
          }),
        }),
      });

      const result = await deleteBettingSession(ctx, 'session-1');

      expect(result.ok).toBe(true);
    });

    it('should return error when delete fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              error: createSupabaseError('UNKNOWN', 'Delete failed'),
            }),
          }),
        }),
      });

      const result = await deleteBettingSession(ctx, 'session-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('STORAGE');
      }
    });
  });

  describe('completeTaskWithBetting', () => {
    it('should call rpc with correct parameters', async () => {
      const ctx = createMockContext();
      const mockRpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
      ctx.mockClient.rpc = mockRpc;

      const result = await completeTaskWithBetting(ctx, 'session-1', true, 'Great job!');

      expect(mockRpc).toHaveBeenCalledWith('complete_task_with_betting', {
        p_session_id: 'session-1',
        p_was_successful: true,
        p_completion_notes: 'Great job!',
      });
      expect(result.ok).toBe(true);
    });

    it('should return error when rpc fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi
        .fn()
        .mockResolvedValue({ data: null, error: createSupabaseError('UNKNOWN', 'RPC failed') });

      const result = await completeTaskWithBetting(ctx, 'session-1', false);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('STORAGE');
      }
    });

    it('should handle null completion notes', async () => {
      const ctx = createMockContext();
      const mockRpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
      ctx.mockClient.rpc = mockRpc;

      await completeTaskWithBetting(ctx, 'session-1', true);

      expect(mockRpc).toHaveBeenCalledWith('complete_task_with_betting', {
        p_session_id: 'session-1',
        p_was_successful: true,
        p_completion_notes: null,
      });
    });
  });

  describe('placeBet', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });
      const betRequest: BetPlacementRequest = {
        session_id: 'session-1',
        bet_amount: 100,
      };

      const result = await placeBet(ctx, betRequest);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_AUTHENTICATED');
      }
    });

    it('should return failure result when write session creation fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockResolvedValue({
        data: { success: false, error: 'Session creation failed' },
        error: null,
      });
      const betRequest: BetPlacementRequest = {
        session_id: 'session-1',
        bet_amount: 100,
      };

      const result = await placeBet(ctx, betRequest);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(false);
        expect(result.value.error_code).toBe('WRITE_SESSION_CREATION_FAILED');
      }
    });

    it('should place bet successfully', async () => {
      const ctx = createMockContext();
      let rpcCallCount = 0;
      ctx.mockClient.rpc = vi.fn().mockImplementation((name) => {
        rpcCallCount++;
        if (name === 'create_write_session') {
          return Promise.resolve({
            data: { success: true, session_token: 'token-123' },
            error: null,
          });
        }
        if (name === 'place_task_bet') {
          return Promise.resolve({
            data: {
              success: true,
              message: 'Bet placed',
              bet_id: 'bet-123',
              bet_amount: 100,
            },
            error: null,
          });
        }
        if (name === 'complete_write_session') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
      const betRequest: BetPlacementRequest = {
        session_id: 'session-1',
        bet_amount: 100,
      };

      const result = await placeBet(ctx, betRequest);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.bet_id).toBe('bet-123');
      }
    });

    it('should return failure result when place_task_bet fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockImplementation((name) => {
        if (name === 'create_write_session') {
          return Promise.resolve({
            data: { success: true, session_token: 'token-123' },
            error: null,
          });
        }
        if (name === 'place_task_bet') {
          return Promise.resolve({
            data: null,
            error: createSupabaseError('INSUFFICIENT_POINTS', 'Not enough points'),
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
      const betRequest: BetPlacementRequest = {
        session_id: 'session-1',
        bet_amount: 100,
      };

      const result = await placeBet(ctx, betRequest);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(false);
        expect(result.value.message).toContain('Not enough points');
      }
    });

    it('should handle exception and complete write session', async () => {
      const ctx = createMockContext();
      let completeSessionCalled = false;
      ctx.mockClient.rpc = vi.fn().mockImplementation((name) => {
        if (name === 'create_write_session') {
          return Promise.resolve({
            data: { success: true, session_token: 'token-123' },
            error: null,
          });
        }
        if (name === 'place_task_bet') {
          throw new Error('Unexpected error');
        }
        if (name === 'complete_write_session') {
          completeSessionCalled = true;
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
      const betRequest: BetPlacementRequest = {
        session_id: 'session-1',
        bet_amount: 100,
      };

      const result = await placeBet(ctx, betRequest);

      expect(result.ok).toBe(false);
      expect(completeSessionCalled).toBe(true);
    });
  });

  describe('getUserAvailablePoints', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await getUserAvailablePoints(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_AUTHENTICATED');
      }
    });

    it('should return points on success', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: { total_points: 1500 },
              error: null,
            }),
          }),
        }),
      });

      const result = await getUserAvailablePoints(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(1500);
      }
    });

    it('should return 0 when user has no points record', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('PGRST116', 'No rows returned'),
            }),
          }),
        }),
      });

      const result = await getUserAvailablePoints(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });

    it('should return error on other database errors', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('UNKNOWN', 'Database error'),
            }),
          }),
        }),
      });

      const result = await getUserAvailablePoints(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('STORAGE');
      }
    });

    it('should return 0 when total_points is null', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: { total_points: null },
              error: null,
            }),
          }),
        }),
      });

      const result = await getUserAvailablePoints(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });
  });

  describe('getTodayBetAmount', () => {
    it('should return 0 when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await getTodayBetAmount(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });

    it('should calculate today bet amount correctly', async () => {
      const mockData = [
        { transaction_type: 'bet_placed', points_change: -100 },
        { transaction_type: 'bet_placed', points_change: -50 },
        { transaction_type: 'bet_refunded', points_change: 25 },
      ];
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  data: mockData,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getTodayBetAmount(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(125);
      }
    });

    it('should return error on database error', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  data: null,
                  error: createSupabaseError('UNKNOWN', 'Database error'),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getTodayBetAmount(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('STORAGE');
      }
    });

    it('should return 0 on exception', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await getTodayBetAmount(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });

    it('should handle empty transaction list', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getTodayBetAmount(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });
  });
});
