import type { CompletionHistory } from '../../types';
import {
  decodeCompletionHistory,
  type SerializedCompletionHistory,
} from '../../serialization';
import { STORAGE_KEYS } from './keys';

export function createCompletionHistoryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `completion-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getCompletionHistory(
  persistBackfilledIds = false,
): CompletionHistory[] {
  const data = localStorage.getItem(STORAGE_KEYS.COMPLETION_HISTORY);
  if (!data) return [];

  let didBackfillIds = false;
  const history = (JSON.parse(data) as SerializedCompletionHistory[]).map((raw) => {
    const decoded = decodeCompletionHistory(raw);
    const id = decoded.id ?? createCompletionHistoryId();
    didBackfillIds ||= !decoded.id;
    return {
      ...decoded,
      id,
      actualDuration:
        raw.actualDuration == null ? undefined : decoded.actualDuration,
      isForwardTimed:
        raw.isForwardTimed == null ? undefined : decoded.isForwardTimed,
    };
  });
  if (persistBackfilledIds && didBackfillIds) saveCompletionHistory(history);
  return history;
}

export function saveCompletionHistory(history: CompletionHistory[]): void {
  localStorage.setItem(
    STORAGE_KEYS.COMPLETION_HISTORY,
    JSON.stringify(history),
  );
}

export function appendCompletionHistory(record: CompletionHistory): void {
  const history = getCompletionHistory();
  saveCompletionHistory([
    ...history,
    { ...record, id: record.id ?? createCompletionHistoryId() },
  ]);
}

export function updateCompletionHistory(
  id: string,
  updates: Pick<CompletionHistory, 'description' | 'notes'>,
): void {
  const history = getCompletionHistory();
  const index = history.findIndex((record) => record.id === id);
  if (index < 0) throw new Error('Completion history record not found');
  history[index] = { ...history[index], ...updates };
  saveCompletionHistory(history);
}
