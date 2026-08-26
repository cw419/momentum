import { describe, expect, it } from 'vitest';
import {
  completionHistoryBasicRowSchema,
  completionHistorySelectRowSchema,
} from '../historyRowSchema';

const baseRow = {
  chain_id: 'chain-1',
  started_at: '2026-01-01T09:35:00Z',
  completed_at: '2026-01-01T10:00:00Z',
  duration: 25,
  was_successful: true,
  reason_for_failure: null,
  description: 'Morning focus',
  notes: null,
};

describe('completionHistorySelectRowSchema', () => {
  it('accepts a valid select row with extended fields', () => {
    const result = completionHistorySelectRowSchema.safeParse({
      ...baseRow,
      actual_duration: 28,
      is_forward_timed: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts nullable extended fields', () => {
    const result = completionHistorySelectRowSchema.safeParse({
      ...baseRow,
      actual_duration: null,
      is_forward_timed: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a row missing actual_duration', () => {
    const result = completionHistorySelectRowSchema.safeParse(baseRow);
    expect(result.success).toBe(false);
  });
});

describe('completionHistoryBasicRowSchema', () => {
  it('accepts a valid basic row', () => {
    const result = completionHistoryBasicRowSchema.safeParse(baseRow);
    expect(result.success).toBe(true);
  });

  it('rejects a row where was_successful is not a boolean', () => {
    const result = completionHistoryBasicRowSchema.safeParse({
      ...baseRow,
      was_successful: 1,
    });
    expect(result.success).toBe(false);
  });
});
