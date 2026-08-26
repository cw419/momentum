import type { CompletionHistory } from '../../../types';
import {
  isRecord,
  parseDateOrUndefined,
  parseTruthyDateOrNow,
  toNumber,
  toOptionalStringFromTruthy,
} from '../../../serialization/primitives';
import { createCompletionHistoryId } from '../../../utils/storage/history';

function mapImportedCompletionHistoryEntry(
  raw: unknown,
  idMap: Map<string, string>,
): CompletionHistory | undefined {
  if (!isRecord(raw)) return undefined;
  if (!('chainId' in raw)) return undefined;

  const mappedChainId = idMap.get(String(raw.chainId));
  if (!mappedChainId) return undefined;

  const duration = Math.max(0, toNumber(raw.duration, 0));

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : createCompletionHistoryId(),
    chainId: mappedChainId,
    startedAt: parseDateOrUndefined(raw.startedAt),
    completedAt: parseTruthyDateOrNow(raw.completedAt),
    duration,
    wasSuccessful: Boolean(raw.wasSuccessful),
    reasonForFailure: toOptionalStringFromTruthy(raw.reasonForFailure),
    actualDuration:
      raw.actualDuration != null
        ? Math.max(0, toNumber(raw.actualDuration, duration))
        : undefined,
    isForwardTimed: Boolean(raw.isForwardTimed),
    description: toOptionalStringFromTruthy(raw.description),
    notes: toOptionalStringFromTruthy(raw.notes),
  };
}

export function parseImportHistory(
  completionHistory: unknown,
  shouldImport: boolean,
  idMap: Map<string, string>,
): CompletionHistory[] {
  if (!shouldImport) return [];
  if (!Array.isArray(completionHistory)) return [];

  const result: CompletionHistory[] = [];
  for (const raw of completionHistory as unknown[]) {
    const entry = mapImportedCompletionHistoryEntry(raw, idMap);
    if (entry) result.push(entry);
  }

  return result;
}
