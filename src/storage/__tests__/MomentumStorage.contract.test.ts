/**
 * MomentumStorage.contract.test.ts
 *
 * Shared behavioural contract for every MomentumStorage implementation.
 * runStorageContract() runs the same behavioural cases against every adapter
 * so regressions surface regardless of which store introduces them.
 *
 * Adapters under test:
 *   localStorageAdapter  (real jsdom localStorage, zero mocks)
 *   InMemoryStorage      (reference implementation defined below)
 *
 * Scope : ChainStore, SessionStore, HistoryStore, TaskTimeStatsStore,
 *         PetStore, RsipStore basics, MaintenanceStore smoke tests.
 * Out of scope: Auth / Betting / Checkin (capability-gated, own tests).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ActiveSession,
  Chain,
  CompletionHistory,
  DeletedChain,
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
  ScheduledSession,
  TaskTimeStats,
} from '../../types';
import type { PetState } from '../../types/pet';
import type { MomentumStorage } from '../MomentumStorage';
import { err, ok } from '../../domain/result';
import { LOCAL_STORAGE_CAPABILITIES } from '../ports';
import { localStorageAdapter } from '../localStorageAdapter';
import { createUnitChain } from '../../test/factories/chainFactory';
import { createPetState } from '../../test/factories/petStateFactory';

// ---------------------------------------------------------------------------
// Test-local factories
// ---------------------------------------------------------------------------

function makeScheduledSession(chainId: string): ScheduledSession {
  return {
    chainId,
    scheduledAt:     new Date('2026-01-10T08:00:00.000Z'),
    expiresAt:       new Date('2026-01-10T09:00:00.000Z'),
    auxiliarySignal: 'put-on-headphones',
  };
}

function makeActiveSession(chainId: string): ActiveSession {
  return {
    chainId,
    startedAt:       new Date('2026-01-10T09:00:00.000Z'),
    duration:        1500,
    isPaused:        false,
    totalPausedTime: 0,
  };
}

function makeHistory(chainId: string): CompletionHistory {
  return {
    chainId,
    completedAt:   new Date('2026-01-10T10:00:00.000Z'),
    duration:      30,
    wasSuccessful: true,
  };
}

function makeRsipNode(id: string): RSIPNode {
  return {
    id,
    title:     'RSIP node ' + id,
    rule:      'Execute daily',
    sortOrder: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function notSupported(message: string) {
  return Promise.resolve(err({ code: 'NOT_SUPPORTED' as const, message }));
}

// ---------------------------------------------------------------------------
// InMemoryStorage — reference implementation used to validate the contract
// ---------------------------------------------------------------------------

class InMemoryStorage implements MomentumStorage {
  readonly kind        = 'local' as const;
  readonly capabilities = LOCAL_STORAGE_CAPABILITIES;

  private chainMap             = new Map<string, Chain>();
  private sessionMap           = new Map<string, ScheduledSession>();
  private activeSession: ActiveSession | null = null;
  private history: CompletionHistory[]        = [];
  private rsipNodes: RSIPNode[]               = [];
  private rsipMeta: RSIPMeta                  = {};
  private rsipGroups: RSIPNodeGroup[]         = [];
  private rsipPolicyLibrary: RSIPLibraryEntry[] = [];
  private rsipRunHistory: RSIPRunRecord[]       = [];
  private rsipTaskLinks: RSIPTaskLink[]         = [];
  private rsipExecutionRecords: RSIPExecutionRecord[] = [];
  private taskStatsMap         = new Map<string, TaskTimeStats>();
  private pet: PetState | null = null;

  reset(): void {
    this.chainMap.clear();
    this.sessionMap.clear();
    this.activeSession = null;
    this.history = [];
    this.rsipNodes = [];
    this.rsipMeta = {};
    this.rsipGroups = [];
    this.rsipPolicyLibrary = [];
    this.rsipRunHistory = [];
    this.rsipTaskLinks = [];
    this.rsipExecutionRecords = [];
    this.taskStatsMap.clear();
    this.pet = null;
  }

  // ChainStore -----------------------------------------------------------

  async getChains(): Promise<Chain[]> {
    return [...this.chainMap.values()];
  }

  async saveChains(chains: Chain[]): Promise<void> {
    this.chainMap.clear();
    for (const c of chains) this.chainMap.set(c.id, c);
  }

  async upsertChain(chain: Chain): Promise<void> {
    this.chainMap.set(chain.id, chain);
  }

  async getActiveChains(): Promise<Chain[]> {
    return [...this.chainMap.values()].filter((c) => !c.deletedAt);
  }

  async getDeletedChains(): Promise<DeletedChain[]> {
    return [...this.chainMap.values()].filter(
      (c): c is DeletedChain => c.deletedAt instanceof Date,
    );
  }

  async softDeleteChain(chainId: string): Promise<void> {
    const chain = this.chainMap.get(chainId);
    if (chain) this.chainMap.set(chainId, { ...chain, deletedAt: new Date() });
  }

  async restoreChain(chainId: string): Promise<void> {
    const chain = this.chainMap.get(chainId);
    if (chain) this.chainMap.set(chainId, { ...chain, deletedAt: undefined });
  }

  async permanentlyDeleteChain(chainId: string): Promise<void> {
    this.chainMap.delete(chainId);
  }

  async cleanupExpiredDeletedChains(olderThanDays = 30): Promise<number> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let count = 0;
    for (const [id, chain] of this.chainMap) {
      if (chain.deletedAt instanceof Date && chain.deletedAt.getTime() < cutoff) {
        this.chainMap.delete(id);
        count++;
      }
    }
    return count;
  }

  // SessionStore ---------------------------------------------------------

  async getScheduledSessions(): Promise<ScheduledSession[]> {
    return [...this.sessionMap.values()];
  }

  async saveScheduledSessions(sessions: ScheduledSession[]): Promise<void> {
    this.sessionMap.clear();
    for (const s of sessions) this.sessionMap.set(s.chainId, s);
  }

  async setScheduledSession(session: ScheduledSession): Promise<void> {
    this.sessionMap.set(session.chainId, session);
  }

  async removeScheduledSession(chainId: string): Promise<void> {
    this.sessionMap.delete(chainId);
  }

  async getActiveSession(): Promise<ActiveSession | null> {
    return this.activeSession;
  }

  async saveActiveSession(session: ActiveSession | null): Promise<void> {
    this.activeSession = session;
  }

  // HistoryStore ---------------------------------------------------------

  async getCompletionHistory(): Promise<CompletionHistory[]> {
    return [...this.history];
  }

  async saveCompletionHistory(history: CompletionHistory[]): Promise<void> {
    this.history = [...history];
  }

  async appendCompletionHistory(record: CompletionHistory): Promise<void> {
    this.history.push(record);
  }

  // RsipStore ------------------------------------------------------------

  async getRSIPNodes(): Promise<RSIPNode[]>         { return [...this.rsipNodes]; }
  async saveRSIPNodes(n: RSIPNode[]): Promise<void> { this.rsipNodes = [...n]; }

  async upsertRSIPNode(node: RSIPNode): Promise<void> {
    const i = this.rsipNodes.findIndex((n) => n.id === node.id);
    if (i >= 0) this.rsipNodes[i] = node;
    else        this.rsipNodes.push(node);
  }

  async removeRSIPNodes(ids: string[]): Promise<void> {
    this.rsipNodes = this.rsipNodes.filter((n) => !ids.includes(n.id));
  }

  async getRSIPMeta(): Promise<RSIPMeta>         { return { ...this.rsipMeta }; }
  async saveRSIPMeta(m: RSIPMeta): Promise<void> { this.rsipMeta = { ...m }; }

  async getRSIPGroups(): Promise<RSIPNodeGroup[]>         { return [...this.rsipGroups]; }
  async saveRSIPGroups(g: RSIPNodeGroup[]): Promise<void> { this.rsipGroups = [...g]; }

  async getRSIPPolicyLibrary(): Promise<RSIPLibraryEntry[]>          { return [...this.rsipPolicyLibrary]; }
  async saveRSIPPolicyLibrary(e: RSIPLibraryEntry[]): Promise<void>  { this.rsipPolicyLibrary = [...e]; }

  async upsertRSIPLibraryEntry(entry: RSIPLibraryEntry): Promise<void> {
    const i = this.rsipPolicyLibrary.findIndex((e) => e.id === entry.id);
    if (i >= 0) this.rsipPolicyLibrary[i] = entry;
    else        this.rsipPolicyLibrary.push(entry);
  }

  async getRSIPRunHistory(): Promise<RSIPRunRecord[]>          { return [...this.rsipRunHistory]; }
  async saveRSIPRunHistory(r: RSIPRunRecord[]): Promise<void>  { this.rsipRunHistory = [...r]; }
  async appendRSIPRunRecord(r: RSIPRunRecord): Promise<void>   { this.rsipRunHistory.push(r); }

  async getRSIPTaskLinks(): Promise<RSIPTaskLink[]>          { return [...this.rsipTaskLinks]; }
  async saveRSIPTaskLinks(l: RSIPTaskLink[]): Promise<void>  { this.rsipTaskLinks = [...l]; }

  async getRSIPExecutionRecords(): Promise<RSIPExecutionRecord[]>         { return [...this.rsipExecutionRecords]; }
  async appendRSIPExecutionRecord(r: RSIPExecutionRecord): Promise<void>  { this.rsipExecutionRecords.push(r); }

  // TaskTimeStatsStore ---------------------------------------------------

  async getTaskTimeStats(): Promise<TaskTimeStats[]> {
    return [...this.taskStatsMap.values()];
  }

  async saveTaskTimeStats(stats: TaskTimeStats[]): Promise<void> {
    this.taskStatsMap.clear();
    for (const s of stats) this.taskStatsMap.set(s.chainId, s);
  }

  async getLastCompletionTime(chainId: string): Promise<number | null> {
    return this.taskStatsMap.get(chainId)?.lastCompletionTime ?? null;
  }

  async updateTaskTimeStats(chainId: string, actualDuration: number): Promise<void> {
    const prev = this.taskStatsMap.get(chainId);
    if (prev) {
      const totalCompletions = prev.totalCompletions + 1;
      const totalTime        = prev.totalTime + actualDuration;
      this.taskStatsMap.set(chainId, {
        ...prev,
        lastCompletionTime:    actualDuration,
        totalCompletions,
        totalTime,
        averageCompletionTime: totalTime / totalCompletions,
      });
    } else {
      this.taskStatsMap.set(chainId, {
        chainId,
        lastCompletionTime:    actualDuration,
        totalCompletions:      1,
        totalTime:             actualDuration,
        averageCompletionTime: actualDuration,
      });
    }
  }

  async getTaskAverageTime(chainId: string): Promise<number | null> {
    return this.taskStatsMap.get(chainId)?.averageCompletionTime ?? null;
  }

  // MaintenanceStore -----------------------------------------------------

  async migrateCompletionHistoryForTiming(): Promise<void> {}
  clearCache(): void {}

  // AuthGateway — local-mode stubs (same semantics as localStorageAdapter)

  async getCurrentUser()        { return ok(null); }
  async waitForAuthentication() { return ok({ user: null, isAuthenticated: false }); }
  async isUserAuthenticated()   { return ok(false); }
  async signUp()  { return notSupported('Auth not supported in local mode'); }
  async signIn()  { return notSupported('Auth not supported in local mode'); }
  async signOut() { return notSupported('Auth not supported in local mode'); }
  onAuthStateChange() { return ok(() => undefined); }

  // UserSettingsGateway — not supported

  async getGamblingSettings()   { return notSupported('UserSettings not supported'); }
  async toggleGamblingMode()    { return notSupported('UserSettings not supported'); }
  async isGamblingModeEnabled() { return ok(false); }

  // BettingGateway — not supported

  async createBettingSession()    { return notSupported('Betting not supported'); }
  async deleteBettingSession()    { return notSupported('Betting not supported'); }
  async completeTaskWithBetting() { return notSupported('Betting not supported'); }
  async placeBet()                { return notSupported('Betting not supported'); }
  async getUserAvailablePoints()  { return notSupported('Betting not supported'); }
  async getTodayBetAmount()       { return notSupported('Betting not supported'); }

  // CheckinGateway — not supported

  async performDailyCheckin() { return notSupported('Checkin not supported'); }
  async getUserCheckinStats() { return notSupported('Checkin not supported'); }

  // PetStore

  async getPetState(): Promise<PetState | null>    { return this.pet; }
  async savePetState(pet: PetState): Promise<void> { this.pet = pet; }
}

// ---------------------------------------------------------------------------
// runStorageContract — shared behavioural contract
// ---------------------------------------------------------------------------

function runStorageContract(
  label: string,
  createStorage: () => MomentumStorage,
): void {
  describe(`MomentumStorage contract [${label}]`, () => {
    let storage: MomentumStorage;

    beforeEach(() => {
      storage = createStorage();
    });

    // -----------------------------------------------------------------------
    // ChainStore
    // -----------------------------------------------------------------------

    describe('ChainStore', () => {
      it('getChains() returns empty array on fresh storage', async () => {
        await expect(storage.getChains()).resolves.toEqual([]);
      });

      it('saveChains + getChains round-trip preserves chain data', async () => {
        const a = createUnitChain({ id: 'c-a', name: 'Alpha' });
        const b = createUnitChain({ id: 'c-b', name: 'Beta' });
        await storage.saveChains([a, b]);

        const loaded = await storage.getChains();
        expect(loaded).toHaveLength(2);
        expect(loaded.find((c) => c.id === 'c-a')?.name).toBe('Alpha');
        expect(loaded.find((c) => c.id === 'c-b')?.name).toBe('Beta');
      });

      it('saveChains + getChains preserves Date instances', async () => {
        const chain = createUnitChain({
          id: 'date-chain',
          createdAt: new Date('2026-03-15T00:00:00.000Z'),
        });
        await storage.saveChains([chain]);
        const [loaded] = await storage.getChains();
        expect(loaded.createdAt).toBeInstanceOf(Date);
        expect(loaded.createdAt.toISOString()).toBe('2026-03-15T00:00:00.000Z');
      });

      it('upsertChain adds a chain that does not yet exist', async () => {
        const chain = createUnitChain({ id: 'new-chain' });
        await storage.upsertChain(chain);
        const all = await storage.getChains();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe('new-chain');
      });

      it('upsertChain updates an existing chain by id', async () => {
        const original = createUnitChain({ id: 'upd-chain', name: 'Before' });
        await storage.upsertChain(original);

        const updated = createUnitChain({ id: 'upd-chain', name: 'After' });
        await storage.upsertChain(updated);

        const all = await storage.getChains();
        expect(all).toHaveLength(1);
        expect(all[0].name).toBe('After');
      });

      it('getActiveChains excludes soft-deleted chains', async () => {
        await storage.saveChains([
          createUnitChain({ id: 'active' }),
          createUnitChain({ id: 'deleted', deletedAt: new Date('2025-01-01T00:00:00.000Z') }),
        ]);
        const active = await storage.getActiveChains();
        expect(active).toHaveLength(1);
        expect(active[0].id).toBe('active');
      });

      it('softDeleteChain moves chain from active to deleted', async () => {
        await storage.saveChains([createUnitChain({ id: 'target' })]);
        await storage.softDeleteChain('target');

        const active  = await storage.getActiveChains();
        const deleted = await storage.getDeletedChains();

        expect(active).toHaveLength(0);
        expect(deleted).toHaveLength(1);
        expect(deleted[0].id).toBe('target');
        expect(deleted[0].deletedAt).toBeInstanceOf(Date);
      });

      it('restoreChain brings a chain back to active', async () => {
        await storage.saveChains([createUnitChain({ id: 'target' })]);
        await storage.softDeleteChain('target');
        await storage.restoreChain('target');

        const active  = await storage.getActiveChains();
        const deleted = await storage.getDeletedChains();

        expect(active).toHaveLength(1);
        expect(deleted).toHaveLength(0);
      });

      it('permanentlyDeleteChain removes chain from all lists', async () => {
        await storage.saveChains([createUnitChain({ id: 'target' })]);
        await storage.softDeleteChain('target');
        await storage.permanentlyDeleteChain('target');

        expect(await storage.getChains()).toHaveLength(0);
        expect(await storage.getDeletedChains()).toHaveLength(0);
      });

      it('cleanupExpiredDeletedChains removes only chains deleted before cutoff', async () => {
        const old    = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
        const recent = new Date(Date.now() - 5  * 24 * 60 * 60 * 1000); // 5 days ago

        await storage.saveChains([
          createUnitChain({ id: 'old-del',    deletedAt: old }),
          createUnitChain({ id: 'recent-del', deletedAt: recent }),
          createUnitChain({ id: 'active' }),
        ]);

        const removed = await storage.cleanupExpiredDeletedChains(30);

        expect(removed).toBe(1);

        const remaining = await storage.getDeletedChains();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe('recent-del');

        const active = await storage.getActiveChains();
        expect(active.find((c) => c.id === 'active')).toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // SessionStore
    // -----------------------------------------------------------------------

    describe('SessionStore', () => {
      it('getScheduledSessions() returns empty array on fresh storage', async () => {
        await expect(storage.getScheduledSessions()).resolves.toEqual([]);
      });

      it('setScheduledSession adds a session accessible via getScheduledSessions', async () => {
        const s = makeScheduledSession('chain-1');
        await storage.setScheduledSession(s);

        const all = await storage.getScheduledSessions();
        expect(all).toHaveLength(1);
        expect(all[0].chainId).toBe('chain-1');
        expect(all[0].auxiliarySignal).toBe('put-on-headphones');
      });

      it('setScheduledSession upserts — same chainId does not create duplicates', async () => {
        const first  = makeScheduledSession('chain-1');
        const second = { ...makeScheduledSession('chain-1'), auxiliarySignal: 'ring-bell' };

        await storage.setScheduledSession(first);
        await storage.setScheduledSession(second);

        const all = await storage.getScheduledSessions();
        expect(all).toHaveLength(1);
        expect(all[0].auxiliarySignal).toBe('ring-bell');
      });

      it('removeScheduledSession removes the matching session', async () => {
        await storage.setScheduledSession(makeScheduledSession('chain-1'));
        await storage.setScheduledSession(makeScheduledSession('chain-2'));
        await storage.removeScheduledSession('chain-1');

        const all = await storage.getScheduledSessions();
        expect(all).toHaveLength(1);
        expect(all[0].chainId).toBe('chain-2');
      });

      it('saveScheduledSessions replaces all existing sessions', async () => {
        await storage.setScheduledSession(makeScheduledSession('old'));
        await storage.saveScheduledSessions([
          makeScheduledSession('new-1'),
          makeScheduledSession('new-2'),
        ]);

        const all = await storage.getScheduledSessions();
        expect(all).toHaveLength(2);
        expect(all.every((s) => s.chainId !== 'old')).toBe(true);
      });

      it('getActiveSession() returns null on fresh storage', async () => {
        await expect(storage.getActiveSession()).resolves.toBeNull();
      });

      it('saveActiveSession + getActiveSession round-trip', async () => {
        const session = makeActiveSession('chain-1');
        await storage.saveActiveSession(session);

        const loaded = await storage.getActiveSession();
        expect(loaded).not.toBeNull();
        expect(loaded?.chainId).toBe('chain-1');
        expect(loaded?.duration).toBe(1500);
        expect(loaded?.isPaused).toBe(false);
      });

      it('saveActiveSession(null) clears the active session', async () => {
        await storage.saveActiveSession(makeActiveSession('chain-1'));
        await storage.saveActiveSession(null);

        await expect(storage.getActiveSession()).resolves.toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // HistoryStore
    // -----------------------------------------------------------------------

    describe('HistoryStore', () => {
      it('getCompletionHistory() returns empty array on fresh storage', async () => {
        await expect(storage.getCompletionHistory()).resolves.toEqual([]);
      });

      it('appendCompletionHistory adds record to history', async () => {
        const record = makeHistory('chain-1');
        await storage.appendCompletionHistory(record);

        const all = await storage.getCompletionHistory();
        expect(all).toHaveLength(1);
        expect(all[0].chainId).toBe('chain-1');
        expect(all[0].wasSuccessful).toBe(true);
      });

      it('multiple appendCompletionHistory calls accumulate in insertion order', async () => {
        await storage.appendCompletionHistory(makeHistory('c-first'));
        await storage.appendCompletionHistory(makeHistory('c-second'));
        await storage.appendCompletionHistory(makeHistory('c-third'));

        const all = await storage.getCompletionHistory();
        expect(all).toHaveLength(3);
        expect(all.map((r) => r.chainId)).toEqual(['c-first', 'c-second', 'c-third']);
      });

      it('saveCompletionHistory replaces all existing records', async () => {
        await storage.appendCompletionHistory(makeHistory('old'));
        await storage.saveCompletionHistory([makeHistory('new-1'), makeHistory('new-2')]);

        const all = await storage.getCompletionHistory();
        expect(all).toHaveLength(2);
        expect(all.every((r) => r.chainId !== 'old')).toBe(true);
      });

      it('saveCompletionHistory([]) clears the history', async () => {
        await storage.appendCompletionHistory(makeHistory('chain-1'));
        await storage.saveCompletionHistory([]);

        await expect(storage.getCompletionHistory()).resolves.toEqual([]);
      });
    });

    // -----------------------------------------------------------------------
    // TaskTimeStatsStore
    // -----------------------------------------------------------------------

    describe('TaskTimeStatsStore', () => {
      it('getTaskTimeStats() returns empty array on fresh storage', async () => {
        await expect(storage.getTaskTimeStats()).resolves.toEqual([]);
      });

      it('getLastCompletionTime returns null when no stats exist', async () => {
        await expect(storage.getLastCompletionTime('unknown')).resolves.toBeNull();
      });

      it('getTaskAverageTime returns null when no stats exist', async () => {
        await expect(storage.getTaskAverageTime('unknown')).resolves.toBeNull();
      });

      it('updateTaskTimeStats creates stats for new chainId', async () => {
        await storage.updateTaskTimeStats('chain-1', 60);

        await expect(storage.getLastCompletionTime('chain-1')).resolves.toBe(60);
        await expect(storage.getTaskAverageTime('chain-1')).resolves.toBe(60);

        const all = await storage.getTaskTimeStats();
        expect(all.find((s) => s.chainId === 'chain-1')).toBeDefined();
      });

      it('updateTaskTimeStats recalculates average on repeated calls', async () => {
        await storage.updateTaskTimeStats('chain-1', 40);
        await storage.updateTaskTimeStats('chain-1', 80);

        await expect(storage.getLastCompletionTime('chain-1')).resolves.toBe(80);
        await expect(storage.getTaskAverageTime('chain-1')).resolves.toBe(60);
      });

      it('saveTaskTimeStats replaces all existing stats', async () => {
        await storage.updateTaskTimeStats('chain-old', 30);
        await storage.saveTaskTimeStats([
          { chainId: 'chain-new', totalCompletions: 1, totalTime: 45 },
        ]);

        const all = await storage.getTaskTimeStats();
        expect(all).toHaveLength(1);
        expect(all[0].chainId).toBe('chain-new');
      });
    });

    // -----------------------------------------------------------------------
    // PetStore
    // -----------------------------------------------------------------------

    describe('PetStore', () => {
      it('getPetState() returns null on fresh storage', async () => {
        await expect(storage.getPetState()).resolves.toBeNull();
      });

      it('savePetState + getPetState round-trip', async () => {
        const pet = createPetState({ id: 'pet-1', name: 'Pixel', level: 3 });
        await storage.savePetState(pet);

        const loaded = await storage.getPetState();
        expect(loaded).not.toBeNull();
        expect(loaded?.id).toBe('pet-1');
        expect(loaded?.name).toBe('Pixel');
        expect(loaded?.level).toBe(3);
        expect(loaded?.createdAt).toBeInstanceOf(Date);
      });

      it('savePetState overwrites the previous state', async () => {
        await storage.savePetState(createPetState({ id: 'pet-1', name: 'Old' }));
        await storage.savePetState(createPetState({ id: 'pet-1', name: 'New' }));

        const loaded = await storage.getPetState();
        expect(loaded?.name).toBe('New');
      });
    });

    // -----------------------------------------------------------------------
    // RsipStore (basic roundtrips)
    // -----------------------------------------------------------------------

    describe('RsipStore — basic roundtrips', () => {
      it('getRSIPNodes() returns empty array on fresh storage', async () => {
        await expect(storage.getRSIPNodes()).resolves.toEqual([]);
      });

      it('saveRSIPNodes + getRSIPNodes round-trip', async () => {
        const nodes = [makeRsipNode('n-1'), makeRsipNode('n-2')];
        await storage.saveRSIPNodes(nodes);

        const loaded = await storage.getRSIPNodes();
        expect(loaded).toHaveLength(2);
        expect(loaded.map((n) => n.id)).toContain('n-1');
        expect(loaded.map((n) => n.id)).toContain('n-2');
      });

      it('upsertRSIPNode adds a new node', async () => {
        await storage.upsertRSIPNode(makeRsipNode('n-new'));

        const all = await storage.getRSIPNodes();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe('n-new');
      });

      it('upsertRSIPNode updates an existing node', async () => {
        await storage.upsertRSIPNode(makeRsipNode('n-1'));
        await storage.upsertRSIPNode({ ...makeRsipNode('n-1'), title: 'Updated' });

        const all = await storage.getRSIPNodes();
        expect(all).toHaveLength(1);
        expect(all[0].title).toBe('Updated');
      });

      it('removeRSIPNodes removes the specified nodes', async () => {
        await storage.saveRSIPNodes([makeRsipNode('n-1'), makeRsipNode('n-2'), makeRsipNode('n-3')]);
        await storage.removeRSIPNodes(['n-1', 'n-3']);

        const all = await storage.getRSIPNodes();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe('n-2');
      });

      it('saveRSIPMeta + getRSIPMeta round-trip', async () => {
        const meta = { allowMultiplePerDay: true, currentRunNumber: 5 };
        await storage.saveRSIPMeta(meta);

        const loaded = await storage.getRSIPMeta();
        expect(loaded.allowMultiplePerDay).toBe(true);
        expect(loaded.currentRunNumber).toBe(5);
      });
    });

    // -----------------------------------------------------------------------
    // MaintenanceStore smoke tests
    // -----------------------------------------------------------------------

    describe('MaintenanceStore', () => {
      it('clearCache() does not throw', () => {
        expect(() => storage.clearCache()).not.toThrow();
      });

      it('migrateCompletionHistoryForTiming() resolves without throwing', async () => {
        await expect(
          storage.migrateCompletionHistoryForTiming(),
        ).resolves.toBeUndefined();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Run the contract against every adapter
// ---------------------------------------------------------------------------

// localStorageAdapter — real jsdom localStorage; createStorage clears it so
// each test starts from a blank slate.
runStorageContract('localStorageAdapter', () => {
  localStorage.clear();
  return localStorageAdapter;
});

// InMemoryStorage — a new instance is created for every test; no global state.
runStorageContract('InMemoryStorage', () => new InMemoryStorage());
