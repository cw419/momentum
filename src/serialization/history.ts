import type { CompletionHistory } from '../types';
import {
  parseDateOrUndefined,
  parseTruthyDateOrNow,
  toBooleanWithDefault,
  toNumber,
  toOptionalStringFromTruthy,
} from './primitives';

export interface SerializedCompletionHistory {
  id?: string;
  chainId: string;
  startedAt?: string | null;
  completedAt?: string | null;
  duration: number;
  wasSuccessful: boolean;
  reasonForFailure?: unknown;
  actualDuration?: unknown;
  isForwardTimed?: unknown;
  description?: unknown;
  notes?: unknown;
}

export function decodeCompletionHistory(
  raw: SerializedCompletionHistory,
): CompletionHistory {
  const duration = toNumber(raw.duration, 0);

  return {
    id: raw.id,
    chainId: raw.chainId,
    startedAt: parseDateOrUndefined(raw.startedAt),
    completedAt: parseTruthyDateOrNow(raw.completedAt),
    duration,
    wasSuccessful: toBooleanWithDefault(raw.wasSuccessful, false),
    reasonForFailure: toOptionalStringFromTruthy(raw.reasonForFailure),
    actualDuration: toNumber(raw.actualDuration, duration),
    isForwardTimed: toBooleanWithDefault(raw.isForwardTimed, false),
    description: toOptionalStringFromTruthy(raw.description),
    notes: toOptionalStringFromTruthy(raw.notes),
  };
}
