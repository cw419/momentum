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

export interface MomentumStorage {
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
}

