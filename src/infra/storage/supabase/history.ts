import type { CompletionHistory } from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';

type CompletionHistoryRow = Database['public']['Tables']['completion_history']['Row'];
type CompletionHistoryInsert = Database['public']['Tables']['completion_history']['Insert'];

type CompletionHistorySelectRow = Pick<
  CompletionHistoryRow,
  | 'chain_id'
  | 'completed_at'
  | 'duration'
  | 'was_successful'
  | 'reason_for_failure'
  | 'actual_duration'
  | 'is_forward_timed'
  | 'description'
  | 'notes'
>;

export async function getCompletionHistory(ctx: SupabaseStorageContext): Promise<CompletionHistory[]> {
  const user = await ctx.getCurrentUser();
  if (!user) return [];

  const client = ctx.getClient();

  const selectFull =
    'chain_id, completed_at, duration, was_successful, reason_for_failure, actual_duration, is_forward_timed, description, notes';
  const selectBasic =
    'chain_id, completed_at, duration, was_successful, reason_for_failure, description, notes';

  const { data, error } = await client
    .from('completion_history')
    .select(selectFull)
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });

  const isMissingTimingColumns =
    !!error &&
    (error.code === '42703' ||
      error.code === 'PGRST204' ||
      error.message?.includes('actual_duration') ||
      error.message?.includes('is_forward_timed'));

  if (error && !isMissingTimingColumns) return [];

  if (isMissingTimingColumns) {
    const { data: basicData, error: basicError } = await client
      .from('completion_history')
      .select(selectBasic)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (basicError || !basicData) return [];

    return basicData.map((history: Pick<
      CompletionHistoryRow,
      | 'chain_id'
      | 'completed_at'
      | 'duration'
      | 'was_successful'
      | 'reason_for_failure'
      | 'description'
      | 'notes'
    >) => ({
      chainId: history.chain_id,
      completedAt: new Date(history.completed_at),
      duration: history.duration,
      wasSuccessful: history.was_successful,
      reasonForFailure: history.reason_for_failure || undefined,
      actualDuration: history.duration,
      isForwardTimed: false,
      description: history.description || undefined,
      notes: history.notes || undefined,
    }));
  }

  if (!data) return [];

  return data.map((history: CompletionHistorySelectRow) => ({
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
  if (history.length === 0) return;

  const client = ctx.getClient();

  const conflictTarget = 'user_id,chain_id,completed_at';
  const isMissingUniqueConstraint = (error: { code?: string; message?: string }) =>
    error.code === '42P10' || error.message?.includes('no unique or exclusion constraint matching');
  const isMissingTimingColumns = (error: { code?: string; message?: string }) =>
    error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('actual_duration') || error.message?.includes('is_forward_timed');

  const chunk = <T>(items: T[], size: number): T[][] => {
    if (items.length <= size) return [items];
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  };

  const toRowsWithNewFields = (items: CompletionHistory[]): CompletionHistoryInsert[] =>
    items.map(h => ({
      chain_id: h.chainId,
      completed_at: h.completedAt.toISOString(),
      duration: h.duration,
      was_successful: h.wasSuccessful,
      reason_for_failure: h.reasonForFailure ?? null,
      actual_duration: h.actualDuration ?? h.duration,
      is_forward_timed: h.isForwardTimed ?? false,
      description: h.description ?? null,
      notes: h.notes ?? null,
      user_id: user.id,
    }));

  const toRowsBasic = (items: CompletionHistory[]): CompletionHistoryInsert[] =>
    items.map(h => ({
      chain_id: h.chainId,
      completed_at: h.completedAt.toISOString(),
      duration: h.duration,
      was_successful: h.wasSuccessful,
      reason_for_failure: h.reasonForFailure ?? null,
      description: h.description ?? null,
      notes: h.notes ?? null,
      user_id: user.id,
    }));

  const upsertChunk = async (rows: CompletionHistoryInsert[]) =>
    client.from('completion_history').upsert(rows, { onConflict: conflictTarget, ignoreDuplicates: true });

  // Use a modest chunk size to avoid oversized requests (import scenarios).
  const CHUNK_SIZE = 500;

  // Prefer upsert (no prefetch), fall back to legacy insert if the unique index is missing.
  const historyChunks = chunk(history, CHUNK_SIZE);

  // Try once with new fields to detect schema compatibility.
  let mode: 'new' | 'basic' = 'new';

  for (const currentChunk of historyChunks) {
    const rows = mode === 'new' ? toRowsWithNewFields(currentChunk) : toRowsBasic(currentChunk);
    let { error } = await upsertChunk(rows);

    if (!error) continue;

    if (isMissingTimingColumns(error)) {
      mode = 'basic';
      ({ error } = await upsertChunk(toRowsBasic(currentChunk)));
      if (!error) continue;
    }

    if (isMissingUniqueConstraint(error)) {
      // Legacy schema: no UNIQUE index for ON CONFLICT. Fallback to best-effort insert.
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

      const tryInsertWithNewFields = async () =>
        client.from('completion_history').insert(toRowsWithNewFields(newHistory));

      const tryInsertBasic = async () =>
        client.from('completion_history').insert(toRowsBasic(newHistory));

      let legacyResult = await tryInsertWithNewFields();
      if (legacyResult.error && isMissingTimingColumns(legacyResult.error)) {
        legacyResult = await tryInsertBasic();
      }

      return;
    }

    // best-effort: ignore other errors
    return;
  }
}

