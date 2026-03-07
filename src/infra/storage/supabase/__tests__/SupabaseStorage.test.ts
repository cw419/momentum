import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseLibMocks = vi.hoisted(() => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
    },
  },
  getCurrentUser: vi.fn(),
  waitForAuthentication: vi.fn(),
  isUserAuthenticated: vi.fn(),
}));

const retryMocks = vi.hoisted(() => ({
  retryOperation: vi.fn(async (operation: () => Promise<unknown>) =>
    operation(),
  ),
  retryWithAuth: vi.fn(
    async (_deps: unknown, operation: () => Promise<unknown>) => operation(),
  ),
}));

const chainsApiMocks = vi.hoisted(() => ({
  getChains: vi.fn(),
  saveChains: vi.fn(),
  getActiveChains: vi.fn(),
  getDeletedChains: vi.fn(),
  softDeleteChain: vi.fn(),
  restoreChain: vi.fn(),
  permanentlyDeleteChain: vi.fn(),
  cleanupExpiredDeletedChains: vi.fn(),
}));

const sessionsApiMocks = vi.hoisted(() => ({
  getScheduledSessions: vi.fn(),
  saveScheduledSessions: vi.fn(),
  setScheduledSession: vi.fn(),
  removeScheduledSession: vi.fn(),
  getActiveSession: vi.fn(),
  saveActiveSession: vi.fn(),
}));

const historyApiMocks = vi.hoisted(() => ({
  getCompletionHistory: vi.fn(),
  saveCompletionHistory: vi.fn(),
  appendCompletionHistory: vi.fn(),
}));

const rsipApiMocks = vi.hoisted(() => ({
  getRSIPNodes: vi.fn(),
  saveRSIPNodes: vi.fn(),
  getRSIPMeta: vi.fn(),
  saveRSIPMeta: vi.fn(),
}));

const taskTimeApiMocks = vi.hoisted(() => ({
  getTaskTimeStats: vi.fn(),
  saveTaskTimeStats: vi.fn(),
  getLastCompletionTime: vi.fn(),
  updateTaskTimeStats: vi.fn(),
  getTaskAverageTime: vi.fn(),
}));

const authApiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  waitForAuthentication: vi.fn(),
  isUserAuthenticated: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

const userSettingsApiMocks = vi.hoisted(() => ({
  getGamblingSettings: vi.fn(),
  toggleGamblingMode: vi.fn(),
  isGamblingModeEnabled: vi.fn(),
}));

const bettingApiMocks = vi.hoisted(() => ({
  createBettingSession: vi.fn(),
  deleteBettingSession: vi.fn(),
  completeTaskWithBetting: vi.fn(),
  placeBet: vi.fn(),
  getUserAvailablePoints: vi.fn(),
  getTodayBetAmount: vi.fn(),
}));

const checkinApiMocks = vi.hoisted(() => ({
  performDailyCheckin: vi.fn(),
  getUserCheckinStats: vi.fn(),
}));

const migrationMocks = vi.hoisted(() => ({
  migrateCompletionHistoryForTiming: vi.fn(),
}));

const storageUtilsMocks = vi.hoisted(() => ({
  storage: {
    getPetState: vi.fn(),
    savePetState: vi.fn(),
  },
}));

vi.mock('../../../../lib/supabase', () => supabaseLibMocks);
vi.mock('../retry', () => retryMocks);
vi.mock('../chains', () => chainsApiMocks);
vi.mock('../sessions', () => sessionsApiMocks);
vi.mock('../history', () => historyApiMocks);
vi.mock('../rsip', () => rsipApiMocks);
vi.mock('../taskTimeStats', () => taskTimeApiMocks);
vi.mock('../auth', () => authApiMocks);
vi.mock('../userSettings', () => userSettingsApiMocks);
vi.mock('../betting', () => bettingApiMocks);
vi.mock('../checkin', () => checkinApiMocks);
vi.mock(
  '../../../../utils/completionHistoryTimingMigration',
  () => migrationMocks,
);
vi.mock('../../../../utils/storage', () => storageUtilsMocks);

import { SupabaseStorage } from '../SupabaseStorage';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('supabase/SupabaseStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    chainsApiMocks.getChains.mockResolvedValue([]);
    chainsApiMocks.getActiveChains.mockResolvedValue([]);
    chainsApiMocks.getDeletedChains.mockResolvedValue([]);
    chainsApiMocks.saveChains.mockResolvedValue(undefined);
    chainsApiMocks.softDeleteChain.mockResolvedValue(undefined);
    chainsApiMocks.restoreChain.mockResolvedValue(undefined);
    chainsApiMocks.permanentlyDeleteChain.mockResolvedValue(undefined);
    chainsApiMocks.cleanupExpiredDeletedChains.mockResolvedValue(0);

    sessionsApiMocks.getScheduledSessions.mockResolvedValue([]);
    sessionsApiMocks.saveScheduledSessions.mockResolvedValue(undefined);
    sessionsApiMocks.setScheduledSession.mockResolvedValue(undefined);
    sessionsApiMocks.removeScheduledSession.mockResolvedValue(undefined);
    sessionsApiMocks.getActiveSession.mockResolvedValue(null);
    sessionsApiMocks.saveActiveSession.mockResolvedValue(undefined);

    historyApiMocks.getCompletionHistory.mockResolvedValue([]);
    historyApiMocks.saveCompletionHistory.mockResolvedValue(undefined);
    historyApiMocks.appendCompletionHistory.mockResolvedValue(undefined);

    rsipApiMocks.getRSIPNodes.mockResolvedValue([]);
    rsipApiMocks.saveRSIPNodes.mockResolvedValue(undefined);
    rsipApiMocks.getRSIPMeta.mockResolvedValue({});
    rsipApiMocks.saveRSIPMeta.mockResolvedValue(undefined);

    taskTimeApiMocks.getTaskTimeStats.mockResolvedValue([]);
    taskTimeApiMocks.saveTaskTimeStats.mockResolvedValue(undefined);
    taskTimeApiMocks.getLastCompletionTime.mockResolvedValue(null);
    taskTimeApiMocks.updateTaskTimeStats.mockResolvedValue(undefined);
    taskTimeApiMocks.getTaskAverageTime.mockResolvedValue(null);

    authApiMocks.getCurrentUser.mockResolvedValue({ ok: true, value: null });
    authApiMocks.waitForAuthentication.mockResolvedValue({
      ok: true,
      value: { user: null, isAuthenticated: false },
    });
    authApiMocks.isUserAuthenticated.mockResolvedValue({
      ok: true,
      value: false,
    });
    authApiMocks.signUp.mockResolvedValue({ ok: true, value: undefined });
    authApiMocks.signIn.mockResolvedValue({ ok: true, value: undefined });
    authApiMocks.signOut.mockResolvedValue({ ok: true, value: undefined });
    authApiMocks.onAuthStateChange.mockReturnValue({
      ok: true,
      value: vi.fn(),
    });

    userSettingsApiMocks.getGamblingSettings.mockResolvedValue({
      ok: true,
      value: {},
    });
    userSettingsApiMocks.toggleGamblingMode.mockResolvedValue({
      ok: true,
      value: {},
    });
    userSettingsApiMocks.isGamblingModeEnabled.mockResolvedValue({
      ok: true,
      value: false,
    });

    bettingApiMocks.createBettingSession.mockResolvedValue({
      ok: true,
      value: 'session-1',
    });
    bettingApiMocks.deleteBettingSession.mockResolvedValue({
      ok: true,
      value: undefined,
    });
    bettingApiMocks.completeTaskWithBetting.mockResolvedValue({
      ok: true,
      value: {},
    });
    bettingApiMocks.placeBet.mockResolvedValue({
      ok: true,
      value: { success: true },
    });
    bettingApiMocks.getUserAvailablePoints.mockResolvedValue({
      ok: true,
      value: 0,
    });
    bettingApiMocks.getTodayBetAmount.mockResolvedValue({ ok: true, value: 0 });

    checkinApiMocks.performDailyCheckin.mockResolvedValue({
      ok: true,
      value: {},
    });
    checkinApiMocks.getUserCheckinStats.mockResolvedValue({
      ok: true,
      value: {},
    });

    migrationMocks.migrateCompletionHistoryForTiming.mockReturnValue({
      updatedHistory: [],
      hasChanges: false,
    });
    storageUtilsMocks.storage.getPetState.mockResolvedValue(null);
    storageUtilsMocks.storage.savePetState.mockResolvedValue(undefined);
  });

  it('deduplicates concurrent read requests and clears pending request after resolve', async () => {
    const storage = new SupabaseStorage();
    const wait = deferred<unknown[]>();
    chainsApiMocks.getChains.mockReturnValueOnce(wait.promise);

    const p1 = storage.getChains();
    const p2 = storage.getChains();

    expect(chainsApiMocks.getChains).toHaveBeenCalledTimes(1);

    wait.resolve([{ id: 'chain-1' }]);
    await expect(Promise.all([p1, p2])).resolves.toEqual([
      [{ id: 'chain-1' }],
      [{ id: 'chain-1' }],
    ]);

    chainsApiMocks.getChains.mockResolvedValueOnce([{ id: 'chain-2' }]);
    await storage.getChains();
    expect(chainsApiMocks.getChains).toHaveBeenCalledTimes(2);
  });

  it('clears pending request after rejection so subsequent calls can retry', async () => {
    const storage = new SupabaseStorage();
    chainsApiMocks.getChains.mockRejectedValueOnce(new Error('boom'));

    await expect(storage.getChains()).rejects.toThrow('boom');

    chainsApiMocks.getChains.mockResolvedValueOnce([]);
    await expect(storage.getChains()).resolves.toEqual([]);
    expect(chainsApiMocks.getChains).toHaveBeenCalledTimes(2);
  });

  it('deduplicates read requests but does not deduplicate writes', async () => {
    const storage = new SupabaseStorage();
    const wait = deferred<unknown[]>();
    historyApiMocks.getCompletionHistory.mockReturnValueOnce(wait.promise);

    const h1 = storage.getCompletionHistory();
    const h2 = storage.getCompletionHistory();

    expect(historyApiMocks.getCompletionHistory).toHaveBeenCalledTimes(1);
    wait.resolve([{ id: 'history-1' }]);
    await Promise.all([h1, h2]);

    await Promise.all([storage.saveChains([]), storage.saveChains([])]);
    expect(chainsApiMocks.saveChains).toHaveBeenCalledTimes(2);
  });

  it('wires retryOperation and retryWithAuth through SupabaseStorage context', async () => {
    const storage = new SupabaseStorage();

    chainsApiMocks.getChains.mockImplementation(
      async (ctx: {
        retryOperation: (...args: unknown[]) => Promise<unknown>;
      }) => {
        await ctx.retryOperation(async () => ['ok'], 4, 20);
        return [];
      },
    );
    chainsApiMocks.saveChains.mockImplementation(
      async (ctx: {
        retryWithAuth: (...args: unknown[]) => Promise<unknown>;
      }) => {
        await ctx.retryWithAuth(async () => undefined, 2, 30);
      },
    );

    await storage.getChains();
    await storage.saveChains([]);

    expect(retryMocks.retryOperation).toHaveBeenCalledWith(
      expect.any(Function),
      4,
      20,
    );
    expect(retryMocks.retryWithAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        isUserAuthenticated: expect.any(Function),
        waitForAuthentication: expect.any(Function),
      }),
      expect.any(Function),
      2,
      30,
    );
  });

  it('migrateCompletionHistoryForTiming saves migrated history only when changes exist', async () => {
    const storage = new SupabaseStorage();

    historyApiMocks.getCompletionHistory.mockResolvedValue([{ id: 'h1' }]);
    chainsApiMocks.getChains.mockResolvedValue([{ id: 'c1' }]);
    migrationMocks.migrateCompletionHistoryForTiming.mockReturnValue({
      updatedHistory: [{ id: 'h2' }],
      hasChanges: true,
    });

    await storage.migrateCompletionHistoryForTiming();
    expect(historyApiMocks.saveCompletionHistory).toHaveBeenCalledWith(
      expect.any(Object),
      [{ id: 'h2' }],
    );

    historyApiMocks.saveCompletionHistory.mockClear();
    migrationMocks.migrateCompletionHistoryForTiming.mockReturnValue({
      updatedHistory: [{ id: 'h3' }],
      hasChanges: false,
    });

    await storage.migrateCompletionHistoryForTiming();
    expect(historyApiMocks.saveCompletionHistory).not.toHaveBeenCalled();
  });

  it('swallows migration errors to avoid breaking callers', async () => {
    const storage = new SupabaseStorage();
    historyApiMocks.getCompletionHistory.mockRejectedValueOnce(
      new Error('read failed'),
    );

    await expect(
      storage.migrateCompletionHistoryForTiming(),
    ).resolves.toBeUndefined();
  });

  it('proxies auth, user settings, betting, and checkin calls to API modules', async () => {
    const storage = new SupabaseStorage();

    await storage.getCurrentUser();
    await storage.waitForAuthentication(123);
    await storage.isUserAuthenticated();
    await storage.signUp('a@example.com', 'pw');
    await storage.signIn('a@example.com', 'pw');
    await storage.signOut();
    storage.onAuthStateChange(vi.fn());

    await storage.getGamblingSettings();
    await storage.toggleGamblingMode();
    await storage.isGamblingModeEnabled();

    await storage.createBettingSession('chain-1', 45);
    await storage.deleteBettingSession('session-1');
    await storage.completeTaskWithBetting('session-1', true, 'good');
    await storage.placeBet({ session_id: 'session-1', bet_amount: 10 });
    await storage.getUserAvailablePoints();
    await storage.getTodayBetAmount();

    await storage.performDailyCheckin();
    await storage.getUserCheckinStats();

    expect(authApiMocks.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(authApiMocks.waitForAuthentication).toHaveBeenCalledWith(123);
    expect(authApiMocks.signIn).toHaveBeenCalledWith('a@example.com', 'pw');
    expect(userSettingsApiMocks.toggleGamblingMode).toHaveBeenCalledWith(
      expect.any(Object),
    );
    expect(bettingApiMocks.createBettingSession).toHaveBeenCalledWith(
      expect.any(Object),
      'chain-1',
      45,
    );
    expect(checkinApiMocks.performDailyCheckin).toHaveBeenCalledWith(
      expect.any(Object),
    );
  });

  it('uses storage utility for pet read/write', async () => {
    const storage = new SupabaseStorage();
    const pet = { id: 'pet-1' };

    storageUtilsMocks.storage.getPetState.mockResolvedValueOnce(pet);
    await expect(storage.getPetState()).resolves.toEqual(pet);

    await storage.savePetState(pet as never);
    expect(storageUtilsMocks.storage.savePetState).toHaveBeenCalledWith(pet);
  });
});
