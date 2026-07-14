import { describe, it, expect, vi, beforeEach } from 'vitest';
import { expectErr, expectOk } from '../../../../test/utils/resultAssertions';
import { performDailyCheckin, getUserCheckinStats } from '../checkin';
import { createMockContext, createSupabaseError } from './testHelpers';

vi.mock('../../../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    dbOperation: vi.fn(),
  },
}));

describe('checkin.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performDailyCheckin', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await performDailyCheckin(ctx);

      const error = expectErr(result);
      expect(error.code).toBe('NOT_AUTHENTICATED');
    });

    it('should return checkin result on success', async () => {
      const mockCheckinResult = {
        success: true,
        message: 'Check-in successful',
        already_checked_in: false,
        checkin_date: '2024-01-15',
        points_earned: 10,
        consecutive_days: 5,
        total_points: 150,
        checkin_id: 'checkin-123',
      };
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockResolvedValue({
        data: mockCheckinResult,
        error: null,
      });

      const result = await performDailyCheckin(ctx);

      const value = expectOk(result);
      expect(value.success).toBe(true);
      expect(value.points_earned).toBe(10);
      expect(value.consecutive_days).toBe(5);
    });

    it('should return error when rpc fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: createSupabaseError('UNKNOWN', 'Check-in failed'),
      });

      const result = await performDailyCheckin(ctx);

      const error = expectErr(result);
      expect(error.code).toBe('STORAGE');
      expect(error.message).toContain('Check-in failed');
    });

    it('should handle already checked in case', async () => {
      const mockCheckinResult = {
        success: true,
        message: 'Already checked in today',
        already_checked_in: true,
        checkin_date: '2024-01-15',
        points_earned: 0,
        consecutive_days: 5,
      };
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockResolvedValue({
        data: mockCheckinResult,
        error: null,
      });

      const result = await performDailyCheckin(ctx);

      const value = expectOk(result);
      expect(value.already_checked_in).toBe(true);
      expect(value.points_earned).toBe(0);
    });

    it('should handle exceptions gracefully', async () => {
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await performDailyCheckin(ctx);

      const error = expectErr(result);
      expect(error.code).toBe('UNKNOWN');
    });

    it('should call rpc with correct parameters', async () => {
      const ctx = createMockContext();
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          success: true,
          message: 'OK',
          already_checked_in: false,
          checkin_date: '2024-01-15',
          points_earned: 10,
          consecutive_days: 1,
        },
        error: null,
      });
      ctx.mockClient.rpc = mockRpc;

      await performDailyCheckin(ctx);

      expect(mockRpc).toHaveBeenCalledWith('perform_daily_checkin', {
        target_user_id: 'test-user-123',
      });
    });
  });

  describe('getUserCheckinStats', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await getUserCheckinStats(ctx);

      const error = expectErr(result);
      expect(error.code).toBe('NOT_AUTHENTICATED');
    });

    it('should return checkin stats on success', async () => {
      const mockStats = {
        user_id: 'test-user-123',
        total_points: 500,
        total_checkins: 30,
        current_streak: 7,
        longest_streak: 15,
        last_checkin_date: '2024-01-15',
        has_checked_in_today: true,
      };
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await getUserCheckinStats(ctx);

      const value = expectOk(result);
      expect(value.total_points).toBe(500);
      expect(value.current_streak).toBe(7);
      expect(value.longest_streak).toBe(15);
      expect(value.has_checked_in_today).toBe(true);
    });

    it('should return error when rpc fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: createSupabaseError('UNKNOWN', 'Failed to get stats'),
      });

      const result = await getUserCheckinStats(ctx);

      const error = expectErr(result);
      expect(error.code).toBe('STORAGE');
      expect(error.message).toContain('Failed to get stats');
    });

    it('should handle user with no checkin history', async () => {
      const mockStats = {
        user_id: 'test-user-123',
        total_points: 0,
        total_checkins: 0,
        current_streak: 0,
        longest_streak: 0,
        last_checkin_date: null,
        has_checked_in_today: false,
      };
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await getUserCheckinStats(ctx);

      const value = expectOk(result);
      expect(value.total_checkins).toBe(0);
      expect(value.last_checkin_date).toBeNull();
      expect(value.has_checked_in_today).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      const ctx = createMockContext();
      ctx.mockClient.rpc = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await getUserCheckinStats(ctx);

      const error = expectErr(result);
      expect(error.code).toBe('UNKNOWN');
    });

    it('should call rpc with correct parameters', async () => {
      const ctx = createMockContext();
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          user_id: 'test-user-123',
          total_points: 0,
          total_checkins: 0,
          current_streak: 0,
          longest_streak: 0,
          last_checkin_date: null,
          has_checked_in_today: false,
        },
        error: null,
      });
      ctx.mockClient.rpc = mockRpc;

      await getUserCheckinStats(ctx);

      expect(mockRpc).toHaveBeenCalledWith('get_user_checkin_stats', {
        target_user_id: 'test-user-123',
      });
    });
  });
});
