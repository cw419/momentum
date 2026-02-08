import type {
  Chain,
  ScheduledSession,
  ActiveSession,
  CompletionHistory,
} from '../../types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  dependencies?: string[];
}

export interface BatchedData {
  chains: Chain[];
  scheduledSessions: ScheduledSession[];
  activeSession: ActiveSession | null;
  completionHistory: CompletionHistory[];
}
