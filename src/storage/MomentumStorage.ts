import type {
  ActiveSession,
  Chain,
  CompletionHistory,
  DeletedChain,
  RSIPMeta,
  RSIPNode,
  ScheduledSession,
  TaskTimeStats,
} from '../types';
import type { PetState } from '../types/pet';
import type {
  AuthenticationResult,
  AuthSession,
  AuthStateChangeEvent,
  AuthUser,
} from '../domain/auth';
import type {
  BetPlacementRequest,
  BetPlacementResult,
} from '../domain/betting';
import type { CheckinResult, CheckinStats } from '../domain/checkin';
import type { AppError } from '../domain/errors';
import type { Result } from '../domain/result';
import type {
  GamblingSettings,
  UpdateSettingsResult,
} from '../domain/userSettings';

export interface MomentumStorage {
  readonly kind: 'local' | 'supabase';

  // Chains
  getChains(): Promise<Chain[]>;
  saveChains(chains: Chain[]): Promise<void>;
  getActiveChains(): Promise<Chain[]>;
  getDeletedChains(): Promise<DeletedChain[]>;
  softDeleteChain(chainId: string): Promise<void>;
  restoreChain(chainId: string): Promise<void>;
  permanentlyDeleteChain(chainId: string): Promise<void>;
  cleanupExpiredDeletedChains(olderThanDays?: number): Promise<number>;

  // Scheduled sessions
  getScheduledSessions(): Promise<ScheduledSession[]>;
  saveScheduledSessions(sessions: ScheduledSession[]): Promise<void>;

  // Active session
  getActiveSession(): Promise<ActiveSession | null>;
  saveActiveSession(session: ActiveSession | null): Promise<void>;

  // Completion history
  getCompletionHistory(): Promise<CompletionHistory[]>;
  saveCompletionHistory(history: CompletionHistory[]): Promise<void>;

  // RSIP
  getRSIPNodes(): Promise<RSIPNode[]>;
  saveRSIPNodes(nodes: RSIPNode[]): Promise<void>;
  getRSIPMeta(): Promise<RSIPMeta>;
  saveRSIPMeta(meta: RSIPMeta): Promise<void>;

  // Task time stats
  getTaskTimeStats(): Promise<TaskTimeStats[]>;
  saveTaskTimeStats(stats: TaskTimeStats[]): Promise<void>;
  getLastCompletionTime(chainId: string): Promise<number | null>;
  updateTaskTimeStats(chainId: string, actualDuration: number): Promise<void>;
  getTaskAverageTime(chainId: string): Promise<number | null>;

  // Compatibility / maintenance
  migrateCompletionHistoryForTiming(): Promise<void>;
  clearCache(): void;

  // Auth (Supabase-only; local returns NOT_SUPPORTED)
  getCurrentUser(): Promise<Result<AuthUser | null, AppError>>;
  waitForAuthentication(
    maxWaitTime?: number,
  ): Promise<Result<AuthenticationResult, AppError>>;
  isUserAuthenticated(): Promise<Result<boolean, AppError>>;
  signUp(email: string, password: string): Promise<Result<void, AppError>>;
  signIn(email: string, password: string): Promise<Result<void, AppError>>;
  signOut(): Promise<Result<void, AppError>>;
  onAuthStateChange(
    callback: (event: AuthStateChangeEvent, session: AuthSession) => void,
  ): Result<() => void, AppError>;

  // User settings (Supabase-only; local returns NOT_SUPPORTED)
  getGamblingSettings(): Promise<Result<GamblingSettings, AppError>>;
  toggleGamblingMode(): Promise<Result<UpdateSettingsResult, AppError>>;
  isGamblingModeEnabled(): Promise<Result<boolean, AppError>>;

  // Betting (Supabase-only; local returns NOT_SUPPORTED)
  createBettingSession(
    chainId: string,
    duration: number,
  ): Promise<Result<string, AppError>>;
  deleteBettingSession(sessionId: string): Promise<Result<void, AppError>>;
  completeTaskWithBetting(
    sessionId: string,
    wasSuccessful: boolean,
    completionNotes?: string,
  ): Promise<Result<unknown, AppError>>;
  placeBet(
    betRequest: BetPlacementRequest,
  ): Promise<Result<BetPlacementResult, AppError>>;
  getUserAvailablePoints(): Promise<Result<number, AppError>>;
  getTodayBetAmount(): Promise<Result<number, AppError>>;

  // Daily check-in (Supabase-only; local returns NOT_SUPPORTED)
  performDailyCheckin(): Promise<Result<CheckinResult, AppError>>;
  getUserCheckinStats(): Promise<Result<CheckinStats, AppError>>;

  // Pet (supported in both local and Supabase modes)
  getPetState(): Promise<PetState | null>;
  savePetState(pet: PetState): Promise<void>;
}
