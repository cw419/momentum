import { z } from 'zod';

const completionHistoryBase = z.object({
  chain_id: z.string(),
  completed_at: z.string(),
  duration: z.number(),
  was_successful: z.boolean(),
  reason_for_failure: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
});

export const completionHistorySelectRowSchema = completionHistoryBase.extend({
  actual_duration: z.number().nullable(),
  is_forward_timed: z.boolean().nullable(),
});

export const completionHistoryBasicRowSchema = completionHistoryBase;

export type CompletionHistorySelectRowParsed = z.infer<
  typeof completionHistorySelectRowSchema
>;
export type CompletionHistoryBasicRowParsed = z.infer<
  typeof completionHistoryBasicRowSchema
>;
