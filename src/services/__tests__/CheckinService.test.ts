import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckinService } from '../CheckinService';
import { err, ok } from '../../domain/result';
import type { AppError } from '../../domain/errors';
import type { CheckinResult, CheckinStats } from '../../domain/checkin';
import { createSupabaseStorageMock } from '../../test/factories';

describe('CheckinService (storage wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performDailyCheckin forwards to storage', async () => {
    const checkinResult: CheckinResult = {
      success: true,
      message: 'ok',
      already_checked_in: false,
      checkin_date: '2025-01-17',
      points_earned: 10,
      consecutive_days: 1,
      total_points: 10,
      checkin_id: 'checkin-1',
    };

    const storage = createSupabaseStorageMock({
      performDailyCheckin: vi.fn().mockResolvedValue(ok(checkinResult)),
    });

    const result = await CheckinService.performDailyCheckin(storage);

    expect(storage.performDailyCheckin).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ok(checkinResult));
  });

  it('getUserStats forwards to storage', async () => {
    const stats: CheckinStats = {
      user_id: 'u1',
      total_points: 100,
      total_checkins: 10,
      current_streak: 5,
      longest_streak: 7,
      last_checkin_date: '2025-01-17',
      has_checked_in_today: true,
    };

    const storage = createSupabaseStorageMock({
      getUserCheckinStats: vi.fn().mockResolvedValue(ok(stats)),
    });

    const result = await CheckinService.getUserStats(storage);

    expect(storage.getUserCheckinStats).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ok(stats));
  });

  it('hasCheckedInToday derives from stats', async () => {
    const stats: CheckinStats = {
      user_id: 'u1',
      total_points: 100,
      total_checkins: 10,
      current_streak: 5,
      longest_streak: 7,
      last_checkin_date: '2025-01-17',
      has_checked_in_today: true,
    };

    const storage = createSupabaseStorageMock({
      getUserCheckinStats: vi.fn().mockResolvedValue(ok(stats)),
    });

    const result = await CheckinService.hasCheckedInToday(storage);

    expect(storage.getUserCheckinStats).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ok(true));
  });

  it('hasCheckedInToday propagates stats error', async () => {
    const storageError: AppError = { code: 'STORAGE', message: 'boom' };
    const storage = createSupabaseStorageMock({
      getUserCheckinStats: vi.fn().mockResolvedValue(err(storageError)),
    });

    const result = await CheckinService.hasCheckedInToday(storage);

    expect(result).toEqual(err(storageError));
  });

  it('getUserPoints derives from stats', async () => {
    const stats: CheckinStats = {
      user_id: 'u1',
      total_points: 123,
      total_checkins: 10,
      current_streak: 5,
      longest_streak: 7,
      last_checkin_date: '2025-01-17',
      has_checked_in_today: false,
    };

    const storage = createSupabaseStorageMock({
      getUserCheckinStats: vi.fn().mockResolvedValue(ok(stats)),
    });

    const result = await CheckinService.getUserPoints(storage);

    expect(result).toEqual(ok(123));
  });

  it('getCurrentStreak derives from stats', async () => {
    const stats: CheckinStats = {
      user_id: 'u1',
      total_points: 0,
      total_checkins: 0,
      current_streak: 9,
      longest_streak: 9,
      last_checkin_date: null,
      has_checked_in_today: false,
    };

    const storage = createSupabaseStorageMock({
      getUserCheckinStats: vi.fn().mockResolvedValue(ok(stats)),
    });

    const result = await CheckinService.getCurrentStreak(storage);

    expect(result).toEqual(ok(9));
  });
});

