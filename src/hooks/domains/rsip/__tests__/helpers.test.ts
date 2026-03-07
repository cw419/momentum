import { describe, expect, it, vi } from 'vitest';
import {
  buildExecutionRecord,
  computeInternalizationProgress,
  ensureDate,
} from '../helpers';

describe('rsip/helpers', () => {
  it('clamps internalization progress to 100 and keeps two decimals', () => {
    expect(computeInternalizationProgress(15)).toBe(25);
    expect(computeInternalizationProgress(60)).toBe(100);
    expect(computeInternalizationProgress(999)).toBe(100);
  });

  it('returns the fallback when the provided date is missing or invalid', () => {
    const fallback = new Date('2026-03-07T00:00:00.000Z');

    expect(ensureDate(undefined, fallback)).toBe(fallback);
    expect(ensureDate(new Date('invalid'), fallback)).toBe(fallback);
  });

  it('builds execution records with contextual metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T08:00:00.000Z'));

    const record = buildExecutionRecord('node-1', 'violated', 'note', {
      reasonCode: 'manual_reason',
      repairHint: 'try again',
      sourceChainId: 'chain-1',
      sourceEvent: 'task_interrupted',
    });

    expect(record).toMatchObject({
      nodeId: 'node-1',
      status: 'violated',
      notes: 'note',
      reasonCode: 'manual_reason',
      repairHint: 'try again',
      sourceChainId: 'chain-1',
      sourceEvent: 'task_interrupted',
    });
    expect(record.executedAt).toEqual(new Date('2026-03-07T08:00:00.000Z'));
    expect(record.id).toEqual(expect.any(String));
  });
});
