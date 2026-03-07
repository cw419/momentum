import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PetState } from '../../types/pet';
import { createUnitChain } from '../../test/factories';
import { localStorageAdapter } from '../localStorageAdapter';

const storageUtilsMock = vi.hoisted(() => ({
  getChains: vi.fn(async () => []),
  saveChains: vi.fn(async () => undefined),
  upsertChain: vi.fn(async () => undefined),
  getActiveChains: vi.fn(async () => []),
  getDeletedChains: vi.fn(async () => []),
  softDeleteChain: vi.fn(async () => undefined),
  restoreChain: vi.fn(async () => undefined),
  permanentlyDeleteChain: vi.fn(async () => undefined),
  cleanupExpiredDeletedChains: vi.fn(async () => undefined),

  getScheduledSessions: vi.fn(async () => []),
  saveScheduledSessions: vi.fn(async () => undefined),

  getActiveSession: vi.fn(async () => null),
  saveActiveSession: vi.fn(async () => undefined),

  getCompletionHistory: vi.fn(async () => []),
  saveCompletionHistory: vi.fn(async () => undefined),

  getRSIPNodes: vi.fn(async () => []),
  saveRSIPNodes: vi.fn(async () => undefined),
  getRSIPMeta: vi.fn(async () => null),
  saveRSIPMeta: vi.fn(async () => undefined),

  getTaskTimeStats: vi.fn(async () => []),
  saveTaskTimeStats: vi.fn(async () => undefined),
  getLastCompletionTime: vi.fn(async () => null),
  updateTaskTimeStats: vi.fn(async () => undefined),
  getTaskAverageTime: vi.fn(async () => 0),
  migrateCompletionHistoryForTiming: vi.fn(async () => undefined),

  getPetState: vi.fn(async () => null),
  savePetState: vi.fn(async () => undefined),

  clearCache: vi.fn(),
}));

vi.mock('../../utils/storage', () => ({
  storage: storageUtilsMock,
}));

function createPetState(overrides: Partial<PetState> = {}): PetState {
  const now = new Date('2026-02-06T10:00:00.000Z');
  return {
    id: overrides.id ?? 'pet-1',
    name: overrides.name ?? 'Momo',
    hunger: overrides.hunger ?? 20,
    happiness: overrides.happiness ?? 80,
    health: overrides.health ?? 90,
    level: overrides.level ?? 2,
    experience: overrides.experience ?? 20,
    stage: overrides.stage ?? 'baby',
    createdAt: overrides.createdAt ?? now,
    lastFedAt: overrides.lastFedAt ?? now,
    lastInteractedAt: overrides.lastInteractedAt ?? now,
    lastDecayCalculatedAt: overrides.lastDecayCalculatedAt ?? now,
    isVisible: overrides.isVisible ?? true,
    isMinimized: overrides.isMinimized ?? false,
    position: overrides.position ?? { x: 80, y: 80 },
    minimizedPosition: overrides.minimizedPosition ?? { x: 92, y: 2 },
  };
}

describe('localStorageAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates all local-storage-backed methods to storage utils', async () => {
    const chain = createUnitChain({ id: 'chain-1', name: 'Chain 1' });
    const chains = [chain];
    const scheduledSessions = [
      { chainId: chain.id, scheduledAt: new Date(), expiresAt: new Date() },
    ];
    const activeSession = {
      chainId: chain.id,
      startedAt: new Date(),
      duration: 1200,
      isPaused: false,
      totalPausedTime: 0,
    };
    const history = [{ chainId: chain.id, completedAt: new Date() }];
    const rsipNodes = [{ id: 'n-1', parentId: null, title: 'Root' }];
    const rsipMeta = { openedToday: true };
    const taskTimeStats = [{ chainId: chain.id, averageSeconds: 60 }];
    const pet = createPetState();

    storageUtilsMock.getChains.mockResolvedValueOnce(chains);
    storageUtilsMock.getActiveChains.mockResolvedValueOnce(chains);
    storageUtilsMock.getDeletedChains.mockResolvedValueOnce(chains);
    storageUtilsMock.getScheduledSessions.mockResolvedValueOnce(
      scheduledSessions as never[],
    );
    storageUtilsMock.getActiveSession.mockResolvedValueOnce(
      activeSession as never,
    );
    storageUtilsMock.getCompletionHistory.mockResolvedValueOnce(
      history as never[],
    );
    storageUtilsMock.getRSIPNodes.mockResolvedValueOnce(rsipNodes as never[]);
    storageUtilsMock.getRSIPMeta.mockResolvedValueOnce(rsipMeta as never);
    storageUtilsMock.getTaskTimeStats.mockResolvedValueOnce(
      taskTimeStats as never[],
    );
    storageUtilsMock.getLastCompletionTime.mockResolvedValueOnce(1234);
    storageUtilsMock.getTaskAverageTime.mockResolvedValueOnce(456);
    storageUtilsMock.getPetState.mockResolvedValueOnce(pet);

    await expect(localStorageAdapter.getChains()).resolves.toEqual(chains);
    await expect(localStorageAdapter.getActiveChains()).resolves.toEqual(
      chains,
    );
    await expect(localStorageAdapter.getDeletedChains()).resolves.toEqual(
      chains,
    );
    await expect(localStorageAdapter.getScheduledSessions()).resolves.toEqual(
      scheduledSessions,
    );
    await expect(localStorageAdapter.getActiveSession()).resolves.toEqual(
      activeSession,
    );
    await expect(localStorageAdapter.getCompletionHistory()).resolves.toEqual(
      history,
    );
    await expect(localStorageAdapter.getRSIPNodes()).resolves.toEqual(
      rsipNodes,
    );
    await expect(localStorageAdapter.getRSIPMeta()).resolves.toEqual(rsipMeta);
    await expect(localStorageAdapter.getTaskTimeStats()).resolves.toEqual(
      taskTimeStats,
    );
    await expect(
      localStorageAdapter.getLastCompletionTime(chain.id),
    ).resolves.toBe(1234);
    await expect(
      localStorageAdapter.getTaskAverageTime(chain.id),
    ).resolves.toBe(456);
    await expect(localStorageAdapter.getPetState()).resolves.toEqual(pet);

    await localStorageAdapter.saveChains(chains);
    await localStorageAdapter.upsertChain(chain);
    await localStorageAdapter.softDeleteChain(chain.id);
    await localStorageAdapter.restoreChain(chain.id);
    await localStorageAdapter.permanentlyDeleteChain(chain.id);
    await localStorageAdapter.cleanupExpiredDeletedChains(30);

    await localStorageAdapter.saveScheduledSessions(
      scheduledSessions as never[],
    );
    await localStorageAdapter.saveActiveSession(activeSession as never);

    await localStorageAdapter.saveCompletionHistory(history as never[]);
    await localStorageAdapter.saveRSIPNodes(rsipNodes as never[]);
    await localStorageAdapter.saveRSIPMeta(rsipMeta as never);

    await localStorageAdapter.saveTaskTimeStats(taskTimeStats as never[]);
    await localStorageAdapter.updateTaskTimeStats(chain.id, 900);
    await localStorageAdapter.migrateCompletionHistoryForTiming();

    await localStorageAdapter.savePetState(pet);
    localStorageAdapter.clearCache();

    expect(storageUtilsMock.saveChains).toHaveBeenCalledWith(chains);
    expect(storageUtilsMock.upsertChain).toHaveBeenCalledWith(chain);
    expect(storageUtilsMock.softDeleteChain).toHaveBeenCalledWith(chain.id);
    expect(storageUtilsMock.restoreChain).toHaveBeenCalledWith(chain.id);
    expect(storageUtilsMock.permanentlyDeleteChain).toHaveBeenCalledWith(
      chain.id,
    );
    expect(storageUtilsMock.cleanupExpiredDeletedChains).toHaveBeenCalledWith(
      30,
    );

    expect(storageUtilsMock.saveScheduledSessions).toHaveBeenCalledWith(
      scheduledSessions,
    );
    expect(storageUtilsMock.saveActiveSession).toHaveBeenCalledWith(
      activeSession,
    );

    expect(storageUtilsMock.saveCompletionHistory).toHaveBeenCalledWith(
      history,
    );
    expect(storageUtilsMock.saveRSIPNodes).toHaveBeenCalledWith(rsipNodes);
    expect(storageUtilsMock.saveRSIPMeta).toHaveBeenCalledWith(rsipMeta);

    expect(storageUtilsMock.saveTaskTimeStats).toHaveBeenCalledWith(
      taskTimeStats,
    );
    expect(storageUtilsMock.updateTaskTimeStats).toHaveBeenCalledWith(
      chain.id,
      900,
    );
    expect(
      storageUtilsMock.migrateCompletionHistoryForTiming,
    ).toHaveBeenCalledTimes(1);

    expect(storageUtilsMock.savePetState).toHaveBeenCalledWith(pet);
    expect(storageUtilsMock.clearCache).toHaveBeenCalledTimes(1);
  });

  it('returns NOT_SUPPORTED for auth, user settings, betting, and check-in methods', async () => {
    const signInResult = await localStorageAdapter.signIn(
      'user@example.com',
      'password',
    );
    const signUpResult = await localStorageAdapter.signUp(
      'user@example.com',
      'password',
    );
    const signOutResult = await localStorageAdapter.signOut();

    const settingsResult = await localStorageAdapter.getGamblingSettings();
    const toggleSettingsResult = await localStorageAdapter.toggleGamblingMode();

    const createBettingSessionResult =
      await localStorageAdapter.createBettingSession('chain-1', 1200);
    const deleteBettingSessionResult =
      await localStorageAdapter.deleteBettingSession('session-1');
    const completeTaskWithBettingResult =
      await localStorageAdapter.completeTaskWithBetting('session-1');
    const placeBetResult = await localStorageAdapter.placeBet({
      session_id: 'session-1',
      bet_amount: 1,
    });
    const getAvailablePointsResult =
      await localStorageAdapter.getUserAvailablePoints();
    const getTodayBetAmountResult =
      await localStorageAdapter.getTodayBetAmount();

    const checkinResult = await localStorageAdapter.performDailyCheckin();
    const checkinStatsResult = await localStorageAdapter.getUserCheckinStats();

    const results = [
      signInResult,
      signUpResult,
      signOutResult,
      settingsResult,
      toggleSettingsResult,
      createBettingSessionResult,
      deleteBettingSessionResult,
      completeTaskWithBettingResult,
      placeBetResult,
      getAvailablePointsResult,
      getTodayBetAmountResult,
      checkinResult,
      checkinStatsResult,
    ];

    results.forEach((result) => {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_SUPPORTED');
      }
    });
  });

  it('returns local-mode auth defaults for supported auth helpers', async () => {
    const currentUserResult = await localStorageAdapter.getCurrentUser();
    const authenticatedResult = await localStorageAdapter.isUserAuthenticated();
    const waitResult = await localStorageAdapter.waitForAuthentication();
    const subscriptionResult = localStorageAdapter.onAuthStateChange(vi.fn());
    const gamblingModeEnabledResult =
      await localStorageAdapter.isGamblingModeEnabled();

    expect(currentUserResult).toEqual({ ok: true, value: null });
    expect(authenticatedResult).toEqual({ ok: true, value: false });
    expect(waitResult).toEqual({
      ok: true,
      value: { user: null, isAuthenticated: false },
    });
    expect(gamblingModeEnabledResult).toEqual({ ok: true, value: false });
    expect(subscriptionResult.ok).toBe(true);

    if (subscriptionResult.ok) {
      expect(typeof subscriptionResult.value).toBe('function');
      subscriptionResult.value();
    }
  });
});
