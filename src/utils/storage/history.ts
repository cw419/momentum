import type { CompletionHistory } from '../../types';
import { STORAGE_KEYS } from './keys';

interface RawHistoryData {
  completedAt: string;
}

export function getCompletionHistory(): CompletionHistory[] {
  const data = localStorage.getItem(STORAGE_KEYS.COMPLETION_HISTORY);
  if (!data) return [];

  return JSON.parse(data).map((history: RawHistoryData & Record<string, unknown>) => ({
    ...history,
    completedAt: new Date(history.completedAt),
  }));
}

export function saveCompletionHistory(history: CompletionHistory[]): void {
  localStorage.setItem(STORAGE_KEYS.COMPLETION_HISTORY, JSON.stringify(history));
}

