import {
  getCurrentUser as supabaseGetCurrentUser,
  isUserAuthenticated as supabaseIsUserAuthenticated,
  supabase,
  waitForAuthentication as supabaseWaitForAuthentication,
} from '../../../lib/supabase';
import type {
  AuthenticationResult,
  AuthSession,
  AuthStateChangeEvent,
  AuthUser,
} from '../../../domain/auth';
import type {
  BetPlacementRequest,
  BetPlacementResult,
} from '../../../domain/betting';
import type { CheckinResult, CheckinStats } from '../../../domain/checkin';
import type { AppError } from '../../../domain/errors';
import type { Result } from '../../../domain/result';
import type {
  GamblingSettings,
  UpdateSettingsResult,
} from '../../../domain/userSettings';
import type {
  ActiveSession,
  Chain,
  CompletionHistory,
  DeletedChain,
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNodeGroup,
  RSIPNode,
  RSIPRunRecord,
  RSIPTaskLink,
  ScheduledSession,
  TaskTimeStats,
} from '../../../types';
import type { PetState } from '../../../types/pet';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { SUPABASE_STORAGE_CAPABILITIES } from '../../../storage/ports';
import { migrateCompletionHistoryForTiming } from '../../../utils/completionHistoryTimingMigration';
import { storage as localStorageUtils } from '../../../utils/storage';
import { retryOperation, retryWithAuth } from './retry';
import type {
  SchemaCapabilityState,
  SchemaVerificationResult,
  SupabaseStorageContext,
} from './types';
import * as authApi from './auth';
import * as bettingApi from './betting';
import * as chainsApi from './chains';
import * as checkinApi from './checkin';
import * as historyApi from './history';
import * as rsipApi from './rsip';
import * as rsipIntentApi from './rsipIntents';
import * as sessionsApi from './sessions';
import * as taskTimeApi from './taskTimeStats';
import * as userSettingsApi from './userSettings';

export class SupabaseStorage implements MomentumStorage {
  readonly kind = 'supabase' as const;
  readonly capabilities = SUPABASE_STORAGE_CAPABILITIES;
  private schemaCache: Map<string, SchemaVerificationResult> = new Map();
  private sessionSchemaVerified: Set<string> = new Set();
  private schemaCapabilityCache: Map<string, SchemaCapabilityState> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private deduplicatedRequest<T>(
    key: string,
    request: () => Promise<T>,
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const promise = request().finally(() => {
      this.pendingRequests.delete(key);
    });
    this.pendingRequests.set(key, promise);
    return promise;
  }

  private getClient(): NonNullable<typeof supabase> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    return supabase;
  }

  clearSchemaCache(): void {
    this.schemaCache.clear();
    this.sessionSchemaVerified.clear();
    this.schemaCapabilityCache.clear();
  }

  clearCache(): void {
    this.clearSchemaCache();
  }

  async verifySchemaColumns(
    tableName: string,
    requiredColumns: string[],
  ): Promise<SchemaVerificationResult> {
    const cacheKey = `${tableName}:${requiredColumns.join(',')}`;

    if (this.sessionSchemaVerified.has(cacheKey)) {
      const cached = this.schemaCache.get(cacheKey);
      if (cached) return cached;
    }
    const result: SchemaVerificationResult = {
      hasAllColumns: true,
      missingColumns: [],
      error:
        'Schema verification skipped to prevent information_schema access issues',
    };

    this.schemaCache.set(cacheKey, result);
    this.sessionSchemaVerified.add(cacheKey);
    return result;
  }

  private getSchemaCapabilityKey(
    tableName: string,
    capabilityName: string,
  ): string {
    return `${tableName}:${capabilityName}`;
  }

  isSchemaCapabilityMissing(
    tableName: string,
    capabilityName: string,
  ): boolean {
    const key = this.getSchemaCapabilityKey(tableName, capabilityName);
    return this.schemaCapabilityCache.get(key) === 'missing';
  }

  markSchemaCapabilityMissing(tableName: string, capabilityName: string): void {
    const key = this.getSchemaCapabilityKey(tableName, capabilityName);
    this.schemaCapabilityCache.set(key, 'missing');
  }

  markSchemaCapabilityAvailable(
    tableName: string,
    capabilityName: string,
  ): void {
    const key = this.getSchemaCapabilityKey(tableName, capabilityName);
    this.schemaCapabilityCache.set(key, 'available');
  }

  private readonly ctx: SupabaseStorageContext = {
    getClient: () => this.getClient(),
    getCurrentUser: () => supabaseGetCurrentUser(),
    waitForAuthentication: (maxWaitTime?: number) =>
      supabaseWaitForAuthentication(maxWaitTime),
    isUserAuthenticated: () => supabaseIsUserAuthenticated(),
    retryOperation: (operation, maxRetries, baseDelay) =>
      retryOperation(operation, maxRetries, baseDelay),
    retryWithAuth: (operation, maxRetries, baseDelay) =>
      retryWithAuth(
        {
          isUserAuthenticated: () => supabaseIsUserAuthenticated(),
          waitForAuthentication: (maxWaitTime?: number) =>
            supabaseWaitForAuthentication(maxWaitTime),
        },
        operation,
        maxRetries,
        baseDelay,
      ),
    verifySchemaColumns: (tableName, requiredColumns) =>
      this.verifySchemaColumns(tableName, requiredColumns),
    isSchemaCapabilityMissing: (tableName, capabilityName) =>
      this.isSchemaCapabilityMissing(tableName, capabilityName),
    markSchemaCapabilityMissing: (tableName, capabilityName) =>
      this.markSchemaCapabilityMissing(tableName, capabilityName),
    markSchemaCapabilityAvailable: (tableName, capabilityName) =>
      this.markSchemaCapabilityAvailable(tableName, capabilityName),
    clearSchemaCache: () => this.clearSchemaCache(),
  };
  getChains(): Promise<Chain[]> {
    return this.deduplicatedRequest('getChains', () =>
      chainsApi.getChains(this.ctx),
    );
  }
  saveChains(chains: Chain[]): Promise<void> {
    return chainsApi.saveChains(this.ctx, chains);
  }
  upsertChain(chain: Chain): Promise<void> {
    return chainsApi.upsertChain(this.ctx, chain);
  }
  getActiveChains(): Promise<Chain[]> {
    return this.deduplicatedRequest('getActiveChains', () =>
      chainsApi.getActiveChains(this.ctx),
    );
  }
  getDeletedChains(): Promise<DeletedChain[]> {
    return this.deduplicatedRequest('getDeletedChains', () =>
      chainsApi.getDeletedChains(this.ctx),
    );
  }
  softDeleteChain(chainId: string): Promise<void> {
    return chainsApi.softDeleteChain(this.ctx, chainId);
  }
  restoreChain(chainId: string): Promise<void> {
    return chainsApi.restoreChain(this.ctx, chainId);
  }
  permanentlyDeleteChain(chainId: string): Promise<void> {
    return chainsApi.permanentlyDeleteChain(this.ctx, chainId);
  }
  cleanupExpiredDeletedChains(olderThanDays?: number): Promise<number> {
    return chainsApi.cleanupExpiredDeletedChains(this.ctx, olderThanDays);
  }
  getScheduledSessions(): Promise<ScheduledSession[]> {
    return this.deduplicatedRequest('getScheduledSessions', () =>
      sessionsApi.getScheduledSessions(this.ctx),
    );
  }
  saveScheduledSessions(sessions: ScheduledSession[]): Promise<void> {
    return sessionsApi.saveScheduledSessions(this.ctx, sessions);
  }
  setScheduledSession(session: ScheduledSession): Promise<void> {
    return sessionsApi.setScheduledSession(this.ctx, session);
  }
  removeScheduledSession(chainId: string): Promise<void> {
    return sessionsApi.removeScheduledSession(this.ctx, chainId);
  }
  getActiveSession(): Promise<ActiveSession | null> {
    return this.deduplicatedRequest('getActiveSession', () =>
      sessionsApi.getActiveSession(this.ctx),
    );
  }
  saveActiveSession(session: ActiveSession | null): Promise<void> {
    return sessionsApi.saveActiveSession(this.ctx, session);
  }
  getCompletionHistory(): Promise<CompletionHistory[]> {
    return this.deduplicatedRequest('getCompletionHistory', () =>
      historyApi.getCompletionHistory(this.ctx),
    );
  }
  saveCompletionHistory(history: CompletionHistory[]): Promise<void> {
    return historyApi.saveCompletionHistory(this.ctx, history);
  }
  appendCompletionHistory(record: CompletionHistory): Promise<void> {
    return historyApi.appendCompletionHistory(this.ctx, record);
  }
  getRSIPNodes(): Promise<RSIPNode[]> {
    return this.deduplicatedRequest('getRSIPNodes', () =>
      rsipApi.getRSIPNodes(this.ctx),
    );
  }
  saveRSIPNodes(nodes: RSIPNode[]): Promise<void> {
    return rsipApi.saveRSIPNodes(this.ctx, nodes);
  }
  upsertRSIPNode(node: RSIPNode): Promise<void> {
    return rsipIntentApi.upsertRSIPNode(this.ctx, node);
  }
  removeRSIPNodes(nodeIds: string[]): Promise<void> {
    return rsipIntentApi.removeRSIPNodes(this.ctx, nodeIds);
  }
  getRSIPMeta(): Promise<RSIPMeta> {
    return this.deduplicatedRequest('getRSIPMeta', () =>
      rsipApi.getRSIPMeta(this.ctx),
    );
  }
  saveRSIPMeta(meta: RSIPMeta): Promise<void> {
    return rsipApi.saveRSIPMeta(this.ctx, meta);
  }
  getRSIPGroups(): Promise<RSIPNodeGroup[]> {
    return this.deduplicatedRequest('getRSIPGroups', () =>
      rsipApi.getRSIPGroups(this.ctx),
    );
  }
  saveRSIPGroups(groups: RSIPNodeGroup[]): Promise<void> {
    return rsipApi.saveRSIPGroups(this.ctx, groups);
  }
  getRSIPPolicyLibrary(): Promise<RSIPLibraryEntry[]> {
    return this.deduplicatedRequest('getRSIPPolicyLibrary', () =>
      rsipApi.getRSIPPolicyLibrary(this.ctx),
    );
  }
  saveRSIPPolicyLibrary(entries: RSIPLibraryEntry[]): Promise<void> {
    return rsipApi.saveRSIPPolicyLibrary(this.ctx, entries);
  }
  upsertRSIPLibraryEntry(entry: RSIPLibraryEntry): Promise<void> {
    return rsipIntentApi.upsertRSIPLibraryEntry(this.ctx, entry);
  }
  getRSIPRunHistory(): Promise<RSIPRunRecord[]> {
    return this.deduplicatedRequest('getRSIPRunHistory', () =>
      rsipApi.getRSIPRunHistory(this.ctx),
    );
  }
  saveRSIPRunHistory(records: RSIPRunRecord[]): Promise<void> {
    return rsipApi.saveRSIPRunHistory(this.ctx, records);
  }
  appendRSIPRunRecord(record: RSIPRunRecord): Promise<void> {
    return rsipIntentApi.appendRSIPRunRecord(this.ctx, record);
  }
  getRSIPTaskLinks(): Promise<RSIPTaskLink[]> {
    return this.deduplicatedRequest('getRSIPTaskLinks', () =>
      rsipApi.getRSIPTaskLinks(this.ctx),
    );
  }
  saveRSIPTaskLinks(links: RSIPTaskLink[]): Promise<void> {
    return rsipApi.saveRSIPTaskLinks(this.ctx, links);
  }
  getRSIPExecutionRecords(): Promise<RSIPExecutionRecord[]> {
    return this.deduplicatedRequest('getRSIPExecutionRecords', () =>
      rsipApi.getRSIPExecutionRecords(this.ctx),
    );
  }
  appendRSIPExecutionRecord(record: RSIPExecutionRecord): Promise<void> {
    return rsipApi.appendRSIPExecutionRecord(this.ctx, record);
  }
  getTaskTimeStats(): Promise<TaskTimeStats[]> {
    return taskTimeApi.getTaskTimeStats();
  }
  saveTaskTimeStats(stats: TaskTimeStats[]): Promise<void> {
    return taskTimeApi.saveTaskTimeStats(stats);
  }
  getLastCompletionTime(chainId: string): Promise<number | null> {
    return taskTimeApi.getLastCompletionTime(chainId);
  }
  updateTaskTimeStats(chainId: string, actualDuration: number): Promise<void> {
    return taskTimeApi.updateTaskTimeStats(chainId, actualDuration);
  }
  getTaskAverageTime(chainId: string): Promise<number | null> {
    return taskTimeApi.getTaskAverageTime(chainId);
  }
  async migrateCompletionHistoryForTiming(): Promise<void> {
    try {
      const [history, chains] = await Promise.all([
        this.getCompletionHistory(),
        this.getChains(),
      ]);
      const { updatedHistory, hasChanges } = migrateCompletionHistoryForTiming(
        history,
        chains,
      );

      if (hasChanges) {
        await this.saveCompletionHistory(updatedHistory);
      }
    } catch {}
  }
  getCurrentUser(): Promise<Result<AuthUser | null, AppError>> {
    return authApi.getCurrentUser();
  }
  waitForAuthentication(
    maxWaitTime?: number,
  ): Promise<Result<AuthenticationResult, AppError>> {
    return authApi.waitForAuthentication(maxWaitTime);
  }
  isUserAuthenticated(): Promise<Result<boolean, AppError>> {
    return authApi.isUserAuthenticated();
  }
  signUp(email: string, password: string): Promise<Result<void, AppError>> {
    return authApi.signUp(email, password);
  }
  signIn(email: string, password: string): Promise<Result<void, AppError>> {
    return authApi.signIn(email, password);
  }
  signOut(): Promise<Result<void, AppError>> {
    return authApi.signOut();
  }
  onAuthStateChange(
    callback: (event: AuthStateChangeEvent, session: AuthSession) => void,
  ): Result<() => void, AppError> {
    return authApi.onAuthStateChange(callback);
  }
  getGamblingSettings(): Promise<Result<GamblingSettings, AppError>> {
    return userSettingsApi.getGamblingSettings(this.ctx);
  }
  toggleGamblingMode(): Promise<Result<UpdateSettingsResult, AppError>> {
    return userSettingsApi.toggleGamblingMode(this.ctx);
  }
  isGamblingModeEnabled(): Promise<Result<boolean, AppError>> {
    return userSettingsApi.isGamblingModeEnabled(this.ctx);
  }
  createBettingSession(
    chainId: string,
    duration: number,
  ): Promise<Result<string, AppError>> {
    return bettingApi.createBettingSession(this.ctx, chainId, duration);
  }
  deleteBettingSession(sessionId: string): Promise<Result<void, AppError>> {
    return bettingApi.deleteBettingSession(this.ctx, sessionId);
  }
  completeTaskWithBetting(
    sessionId: string,
    wasSuccessful: boolean,
    completionNotes?: string,
  ): Promise<Result<unknown, AppError>> {
    return bettingApi.completeTaskWithBetting(
      this.ctx,
      sessionId,
      wasSuccessful,
      completionNotes,
    );
  }
  placeBet(
    betRequest: BetPlacementRequest,
  ): Promise<Result<BetPlacementResult, AppError>> {
    return bettingApi.placeBet(this.ctx, betRequest);
  }
  getUserAvailablePoints(): Promise<Result<number, AppError>> {
    return bettingApi.getUserAvailablePoints(this.ctx);
  }
  getTodayBetAmount(): Promise<Result<number, AppError>> {
    return bettingApi.getTodayBetAmount(this.ctx);
  }
  performDailyCheckin(): Promise<Result<CheckinResult, AppError>> {
    return checkinApi.performDailyCheckin(this.ctx);
  }
  getUserCheckinStats(): Promise<Result<CheckinStats, AppError>> {
    return checkinApi.getUserCheckinStats(this.ctx);
  }
  async getPetState(): Promise<PetState | null> {
    return localStorageUtils.getPetState();
  }
  async savePetState(pet: PetState): Promise<void> {
    return localStorageUtils.savePetState(pet);
  }
}
