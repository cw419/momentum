import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { CheckinService } from '../CheckinService';
import { err, ok } from '../../domain/result';
import type { AppError } from '../../domain/errors';
import type { CheckinResult, CheckinStats } from '../../domain/checkin';

function createStorageMock(overrides?: Partial<MomentumStorage>): MomentumStorage {
  return {
    kind: 'supabase',

    // Chains
    getChains: vi.fn(),
    saveChains: vi.fn(),
    getActiveChains: vi.fn(),
    getDeletedChains: vi.fn(),
    softDeleteChain: vi.fn(),
    restoreChain: vi.fn(),
    permanentlyDeleteChain: vi.fn(),
    cleanupExpiredDeletedChains: vi.fn(),

    // Scheduled sessions
    getScheduledSessions: vi.fn(),
    saveScheduledSessions: vi.fn(),

    // Active session
    getActiveSession: vi.fn(),
    saveActiveSession: vi.fn(),

    // Completion history
    getCompletionHistory: vi.fn(),
    saveCompletionHistory: vi.fn(),

    // RSIP
    getRSIPNodes: vi.fn(),
    saveRSIPNodes: vi.fn(),
    getRSIPMeta: vi.fn(),
    saveRSIPMeta: vi.fn(),

    // Task time stats
    getTaskTimeStats: vi.fn(),
    saveTaskTimeStats: vi.fn(),
    getLastCompletionTime: vi.fn(),
    updateTaskTimeStats: vi.fn(),
    getTaskAverageTime: vi.fn(),

    // Compatibility / maintenance
    migrateCompletionHistoryForTiming: vi.fn(),
    clearCache: vi.fn(),

    // Auth
    getCurrentUser: vi.fn(),
    waitForAuthentication: vi.fn(),
    isUserAuthenticated: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),

    // User settings
    getGamblingSettings: vi.fn(),
    toggleGamblingMode: vi.fn(),
    isGamblingModeEnabled: vi.fn(),

    // Betting
    createBettingSession: vi.fn(),
    deleteBettingSession: vi.fn(),
    completeTaskWithBetting: vi.fn(),
    placeBet: vi.fn(),
    getUserAvailablePoints: vi.fn(),
    getTodayBetAmount: vi.fn(),

    // Daily check-in
    performDailyCheckin: vi.fn(),
    getUserCheckinStats: vi.fn(),

    ...overrides,
  } as unknown as MomentumStorage;
}

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

    const storage = createStorageMock({
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

    const storage = createStorageMock({
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

    const storage = createStorageMock({
      getUserCheckinStats: vi.fn().mockResolvedValue(ok(stats)),
    });

    const result = await CheckinService.hasCheckedInToday(storage);

    expect(storage.getUserCheckinStats).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ok(true));
  });

  it('hasCheckedInToday propagates stats error', async () => {
    const storageError: AppError = { code: 'STORAGE', message: 'boom' };
    const storage = createStorageMock({
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

    const storage = createStorageMock({
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

    const storage = createStorageMock({
      getUserCheckinStats: vi.fn().mockResolvedValue(ok(stats)),
    });

    const result = await CheckinService.getCurrentStreak(storage);

    expect(result).toEqual(ok(9));
  });
});

