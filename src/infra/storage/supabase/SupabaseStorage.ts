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

  // Chains
  getChains(): Promise<Chain[]> {
    return chainsApi.getChains(this.ctx);
  }
  saveChains(chains: Chain[]): Promise<void> {
    return chainsApi.saveChains(this.ctx, chains);
  }
  getActiveChains(): Promise<Chain[]> {
    return chainsApi.getActiveChains(this.ctx);
  }
  getDeletedChains(): Promise<DeletedChain[]> {
    return chainsApi.getDeletedChains(this.ctx);
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

  // Scheduled sessions
  getScheduledSessions(): Promise<ScheduledSession[]> {
    return sessionsApi.getScheduledSessions(this.ctx);
  }
  saveScheduledSessions(sessions: ScheduledSession[]): Promise<void> {
    return sessionsApi.saveScheduledSessions(this.ctx, sessions);
  }

  // Active session
  getActiveSession(): Promise<ActiveSession | null> {
    return sessionsApi.getActiveSession(this.ctx);
  }
  saveActiveSession(session: ActiveSession | null): Promise<void> {
    return sessionsApi.saveActiveSession(this.ctx, session);
  }

  // Completion history
  getCompletionHistory(): Promise<CompletionHistory[]> {
    return historyApi.getCompletionHistory(this.ctx);
  }
  saveCompletionHistory(history: CompletionHistory[]): Promise<void> {
    return historyApi.saveCompletionHistory(this.ctx, history);
  }

  // RSIP
  getRSIPNodes(): Promise<RSIPNode[]> {
    return rsipApi.getRSIPNodes(this.ctx);
  }
  saveRSIPNodes(nodes: RSIPNode[]): Promise<void> {
    return rsipApi.saveRSIPNodes(this.ctx, nodes);
  }
  getRSIPMeta(): Promise<RSIPMeta> {
    return rsipApi.getRSIPMeta(this.ctx);
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
      const history = await this.getCompletionHistory();
      const chains = await this.getChains();
      let hasChanges = false;

      const updatedHistory = history.map(record => {
        if ((record as any).actualDuration !== undefined && (record as any).isForwardTimed !== undefined) {
          return record;
        }

        const chain = chains.find(c => c.id === record.chainId);
        const migratedRecord = {
          ...record,
          actualDuration: record.duration,
          isForwardTimed: chain?.isDurationless || false,
        } as any;

        hasChanges = true;
        return migratedRecord;
      });

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

