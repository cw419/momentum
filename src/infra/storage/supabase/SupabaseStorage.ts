import {
  getCurrentUser as supabaseGetCurrentUser,
  isUserAuthenticated as supabaseIsUserAuthenticated,
  supabase,
  waitForAuthentication as supabaseWaitForAuthentication,
} from '../../../lib/supabase';
import type { AuthenticationResult, AuthSession, AuthStateChangeEvent, AuthUser } from '../../../domain/auth';
import type { BetPlacementRequest, BetPlacementResult } from '../../../domain/betting';
import type { CheckinResult, CheckinStats } from '../../../domain/checkin';
import type { AppError } from '../../../domain/errors';
import type { Result } from '../../../domain/result';
import type { GamblingSettings, UpdateSettingsResult } from '../../../domain/userSettings';
import type {
  ActiveSession,
  Chain,
  CompletionHistory,
  DeletedChain,
  RSIPMeta,
  RSIPNode,
  ScheduledSession,
  TaskTimeStats,
} from '../../../types';
import type { PetState } from '../../../types/pet';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { migrateCompletionHistoryForTiming } from '../../../utils/completionHistoryTimingMigration';
import { storage as localStorageUtils } from '../../../utils/storage';
import { retryOperation, retryWithAuth } from './retry';
import type { SchemaVerificationResult, SupabaseStorageContext } from './types';
import * as authApi from './auth';
import * as bettingApi from './betting';
import * as chainsApi from './chains';
import * as checkinApi from './checkin';
import * as historyApi from './history';
import * as rsipApi from './rsip';
import * as sessionsApi from './sessions';
import * as taskTimeApi from './taskTimeStats';
import * as userSettingsApi from './userSettings';

export class SupabaseStorage implements MomentumStorage {
  readonly kind = 'supabase' as const;

  private schemaCache: Map<string, SchemaVerificationResult> = new Map();
  private sessionSchemaVerified: Set<string> = new Set();

  // Request deduplication: prevents multiple concurrent calls from triggering duplicate queries
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  /**
   * Deduplicates concurrent requests with the same key.
   * If a request with the same key is already in-flight, returns the existing promise.
   * This prevents redundant database queries when multiple components request the same data simultaneously.
   */
  private deduplicatedRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
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
  }

  clearCache(): void {
    this.clearSchemaCache();
  }

  async verifySchemaColumns(tableName: string, requiredColumns: string[]): Promise<SchemaVerificationResult> {
    const cacheKey = `${tableName}:${requiredColumns.join(',')}`;

    if (this.sessionSchemaVerified.has(cacheKey)) {
      const cached = this.schemaCache.get(cacheKey);
      if (cached) return cached;
    }

    // Keep schema verification conservative: avoid information_schema access in production.
    const result: SchemaVerificationResult = {
      hasAllColumns: true,
      missingColumns: [],
      error: 'Schema verification skipped to prevent information_schema access issues',
    };

    this.schemaCache.set(cacheKey, result);
    this.sessionSchemaVerified.add(cacheKey);
    return result;
  }

  private readonly ctx: SupabaseStorageContext = {
    getClient: () => this.getClient(),
    getCurrentUser: () => supabaseGetCurrentUser(),
    waitForAuthentication: (maxWaitTime?: number) => supabaseWaitForAuthentication(maxWaitTime),
    isUserAuthenticated: () => supabaseIsUserAuthenticated(),
    retryOperation: (operation, maxRetries, baseDelay) => retryOperation(operation, maxRetries, baseDelay),
    retryWithAuth: (operation, maxRetries, baseDelay) =>
      retryWithAuth(
        {
          isUserAuthenticated: () => supabaseIsUserAuthenticated(),
          waitForAuthentication: (maxWaitTime?: number) => supabaseWaitForAuthentication(maxWaitTime),
        },
        operation,
        maxRetries,
        baseDelay
      ),
    verifySchemaColumns: (tableName, requiredColumns) => this.verifySchemaColumns(tableName, requiredColumns),
    clearSchemaCache: () => this.clearSchemaCache(),
  };

  // Chains (with request deduplication for read operations)
  getChains(): Promise<Chain[]> {
    return this.deduplicatedRequest('getChains', () => chainsApi.getChains(this.ctx));
  }
  saveChains(chains: Chain[]): Promise<void> {
    return chainsApi.saveChains(this.ctx, chains);
  }
  getActiveChains(): Promise<Chain[]> {
    return this.deduplicatedRequest('getActiveChains', () => chainsApi.getActiveChains(this.ctx));
  }
  getDeletedChains(): Promise<DeletedChain[]> {
    return this.deduplicatedRequest('getDeletedChains', () => chainsApi.getDeletedChains(this.ctx));
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

  // Scheduled sessions (with request deduplication for read operations)
  getScheduledSessions(): Promise<ScheduledSession[]> {
    return this.deduplicatedRequest('getScheduledSessions', () => sessionsApi.getScheduledSessions(this.ctx));
  }
  saveScheduledSessions(sessions: ScheduledSession[]): Promise<void> {
    return sessionsApi.saveScheduledSessions(this.ctx, sessions);
  }

  // Active session (with request deduplication for read operations)
  getActiveSession(): Promise<ActiveSession | null> {
    return this.deduplicatedRequest('getActiveSession', () => sessionsApi.getActiveSession(this.ctx));
  }
  saveActiveSession(session: ActiveSession | null): Promise<void> {
    return sessionsApi.saveActiveSession(this.ctx, session);
  }

  // Completion history (with request deduplication for read operations)
  getCompletionHistory(): Promise<CompletionHistory[]> {
    return this.deduplicatedRequest('getCompletionHistory', () => historyApi.getCompletionHistory(this.ctx));
  }
  saveCompletionHistory(history: CompletionHistory[]): Promise<void> {
    return historyApi.saveCompletionHistory(this.ctx, history);
  }

  // RSIP (with request deduplication for read operations)
  getRSIPNodes(): Promise<RSIPNode[]> {
    return this.deduplicatedRequest('getRSIPNodes', () => rsipApi.getRSIPNodes(this.ctx));
  }
  saveRSIPNodes(nodes: RSIPNode[]): Promise<void> {
    return rsipApi.saveRSIPNodes(this.ctx, nodes);
  }
  getRSIPMeta(): Promise<RSIPMeta> {
    return this.deduplicatedRequest('getRSIPMeta', () => rsipApi.getRSIPMeta(this.ctx));
  }
  saveRSIPMeta(meta: RSIPMeta): Promise<void> {
    return rsipApi.saveRSIPMeta(this.ctx, meta);
  }

  // Task time stats
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

  // Compatibility / maintenance
  async migrateCompletionHistoryForTiming(): Promise<void> {
    try {
      const [history, chains] = await Promise.all([this.getCompletionHistory(), this.getChains()]);
      const { updatedHistory, hasChanges } = migrateCompletionHistoryForTiming(history, chains);

      if (hasChanges) {
        await this.saveCompletionHistory(updatedHistory);
      }
    } catch {
      // ignore
    }
  }

  // Auth (supabase)
  getCurrentUser(): Promise<Result<AuthUser | null, AppError>> {
    return authApi.getCurrentUser();
  }
  waitForAuthentication(maxWaitTime?: number): Promise<Result<AuthenticationResult, AppError>> {
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
  onAuthStateChange(callback: (event: AuthStateChangeEvent, session: AuthSession) => void): Result<() => void, AppError> {
    return authApi.onAuthStateChange(callback);
  }

  // User settings (supabase)
  getGamblingSettings(): Promise<Result<GamblingSettings, AppError>> {
    return userSettingsApi.getGamblingSettings(this.ctx);
  }
  toggleGamblingMode(): Promise<Result<UpdateSettingsResult, AppError>> {
    return userSettingsApi.toggleGamblingMode(this.ctx);
  }
  isGamblingModeEnabled(): Promise<Result<boolean, AppError>> {
    return userSettingsApi.isGamblingModeEnabled(this.ctx);
  }

  // Betting (supabase)
  createBettingSession(chainId: string, duration: number): Promise<Result<string, AppError>> {
    return bettingApi.createBettingSession(this.ctx, chainId, duration);
  }
  deleteBettingSession(sessionId: string): Promise<Result<void, AppError>> {
    return bettingApi.deleteBettingSession(this.ctx, sessionId);
  }
  completeTaskWithBetting(sessionId: string, wasSuccessful: boolean, completionNotes?: string): Promise<Result<unknown, AppError>> {
    return bettingApi.completeTaskWithBetting(this.ctx, sessionId, wasSuccessful, completionNotes);
  }
  placeBet(betRequest: BetPlacementRequest): Promise<Result<BetPlacementResult, AppError>> {
    return bettingApi.placeBet(this.ctx, betRequest);
  }
  getUserAvailablePoints(): Promise<Result<number, AppError>> {
    return bettingApi.getUserAvailablePoints(this.ctx);
  }
  getTodayBetAmount(): Promise<Result<number, AppError>> {
    return bettingApi.getTodayBetAmount(this.ctx);
  }

  // Daily check-in (supabase)
  performDailyCheckin(): Promise<Result<CheckinResult, AppError>> {
    return checkinApi.performDailyCheckin(this.ctx);
  }
  getUserCheckinStats(): Promise<Result<CheckinStats, AppError>> {
    return checkinApi.getUserCheckinStats(this.ctx);
  }

  // Pet (uses localStorage for now, could be extended to Supabase in the future)
  async getPetState(): Promise<PetState | null> {
    return localStorageUtils.getPetState();
  }
  async savePetState(pet: PetState): Promise<void> {
    return localStorageUtils.savePetState(pet);
  }
}

