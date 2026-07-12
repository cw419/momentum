import { z } from 'zod';

export const scheduledSessionRowSchema = z.object({
  chain_id: z.string(),
  scheduled_at: z.string(),
  expires_at: z.string(),
  auxiliary_signal: z.string().nullable(),
});

export const activeSessionRowSchema = z.object({
  id: z.string(),
  chain_id: z.string(),
  started_at: z.string(),
  duration: z.number(),
  is_paused: z.boolean(),
  paused_at: z.string().nullable(),
  total_paused_time: z.number(),
  is_forward_timer: z.boolean().nullable().optional(),
  forward_elapsed_time: z.number().nullable().optional(),
});
