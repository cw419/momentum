import type { RSIPExecutionRecord } from '../../../types';
import {
  INTERNALIZATION_TARGET_DAYS,
  type MarkExecutionOptions,
  type MarkViolationOptions,
} from './types';

export function computeInternalizationProgress(days: number): number {
  const raw = (Math.max(0, days) / INTERNALIZATION_TARGET_DAYS) * 100;
  return Math.min(100, Math.round(raw * 100) / 100);
}

export function ensureDate(value: Date | undefined, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  return fallback;
}

export function buildExecutionRecord(
  nodeId: string,
  status: RSIPExecutionRecord['status'],
  notes?: string,
  options?: MarkExecutionOptions | MarkViolationOptions,
): RSIPExecutionRecord {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    nodeId,
    executedAt: now,
    status,
    notes,
    reasonCode: options?.reasonCode,
    repairHint: options?.repairHint,
    sourceChainId: options?.sourceChainId,
    sourceEvent: options?.sourceEvent,
  };
}
