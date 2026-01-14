import type { CompletionHistory } from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';

type CompletionHistoryRow = Database['public']['Tables']['completion_history']['Row'];

export async function getCompletionHistory(ctx: SupabaseStorageContext): Promise<CompletionHistory[]> {
  const user = await ctx.getCurrentUser();
  if (!user) return [];

  const client = ctx.getClient();
  const { data, error } = await client
    .from('completion_history')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });

  if (error) return [];
  if (!data) return [];

  return data.map((history: CompletionHistoryRow) => ({
    chainId: history.chain_id,
    completedAt: new Date(history.completed_at),
    duration: history.duration,
    wasSuccessful: history.was_successful,
    reasonForFailure: history.reason_for_failure || undefined,
    actualDuration: history.actual_duration ?? history.duration,
    isForwardTimed: history.is_forward_timed ?? false,
    description: history.description || undefined,
    notes: history.notes || undefined,
  }));
}

export async function saveCompletionHistory(ctx: SupabaseStorageContext, history: CompletionHistory[]): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();

  const { data: existingHistory } = await client
    .from('completion_history')
    .select('chain_id, completed_at')
    .eq('user_id', user.id);

  const existingKeys = new Set(
    (existingHistory || []).map((h: { chain_id: string; completed_at: string }) => {
      const normalizedTime = new Date(h.completed_at).getTime();
      return `${h.chain_id}-${normalizedTime}`;
    })
  );

  const newHistory = history.filter(h => {
    const normalizedTime = h.completedAt.getTime();
    const key = `${h.chainId}-${normalizedTime}`;
    return !existingKeys.has(key);
  });

  if (newHistory.length === 0) return;

  const tryInsertWithNewFields = async () => {
    return await client.from('completion_history').insert(
      newHistory.map(h => ({
        chain_id: h.chainId,
        completed_at: h.completedAt.toISOString(),
        duration: h.duration,
        was_successful: h.wasSuccessful,
        reason_for_failure: h.reasonForFailure,
        actual_duration: h.actualDuration ?? h.duration,
        is_forward_timed: h.isForwardTimed ?? false,
        description: h.description ?? null,
        notes: h.notes ?? null,
        user_id: user.id,
      }))
    );
  };

  const tryInsertBasic = async () => {
    return await client.from('completion_history').insert(
      newHistory.map(h => ({
        chain_id: h.chainId,
        completed_at: h.completedAt.toISOString(),
        duration: h.duration,
        was_successful: h.wasSuccessful,
        reason_for_failure: h.reasonForFailure,
        description: h.description ?? null,
        notes: h.notes ?? null,
        user_id: user.id,
      }))
    );
  };

  let { error } = await tryInsertWithNewFields();
  if (error && (error.code === '42703' || error.message?.includes('actual_duration') || error.message?.includes('is_forward_timed'))) {
    ({ error } = await tryInsertBasic());
  }

  if (error) {
    // best-effort: ignore
  }
}

