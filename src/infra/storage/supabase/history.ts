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

type CompletionHistoryBasicRow = Pick<
  CompletionHistoryRow,
  | 'chain_id'
  | 'completed_at'
  | 'duration'
  | 'was_successful'
  | 'reason_for_failure'
  | 'description'
  | 'notes'
>;

type ErrorWithCodeAndMessage = { code?: string; message?: string };

function isMissingTimingColumnsError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.message?.includes('actual_duration') === true ||
    error.message?.includes('is_forward_timed') === true
  );
}

function mapBasicCompletionHistory(history: CompletionHistoryBasicRow): CompletionHistory {
  return {
    chainId: history.chain_id,
    completedAt: new Date(history.completed_at),
    duration: history.duration,
    wasSuccessful: history.was_successful,
    reasonForFailure: history.reason_for_failure || undefined,
    actualDuration: history.duration,
    isForwardTimed: false,
    description: history.description || undefined,
    notes: history.notes || undefined,
  };
}

function mapCompletionHistory(history: CompletionHistorySelectRow): CompletionHistory {
  return {
    chainId: history.chain_id,
    completedAt: new Date(history.completed_at),
    duration: history.duration,
    wasSuccessful: history.was_successful,
    reasonForFailure: history.reason_for_failure || undefined,
    actualDuration: history.actual_duration ?? history.duration,
    isForwardTimed: history.is_forward_timed ?? false,
    description: history.description || undefined,
    notes: history.notes || undefined,
  };
}

function isMissingUniqueConstraintError(error: ErrorWithCodeAndMessage): boolean {
  return (
    error.code === '42P10' ||
    error.message?.includes('no unique or exclusion constraint matching') === true
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toRowsWithNewFields(items: CompletionHistory[], userId: string): CompletionHistoryInsert[] {
  return items.map(h => ({
    chain_id: h.chainId,
    completed_at: h.completedAt.toISOString(),
    duration: h.duration,
    was_successful: h.wasSuccessful,
    reason_for_failure: h.reasonForFailure ?? null,
    actual_duration: h.actualDuration ?? h.duration,
    is_forward_timed: h.isForwardTimed ?? false,
    description: h.description ?? null,
    notes: h.notes ?? null,
    user_id: userId,
  }));
}

function toRowsBasic(items: CompletionHistory[], userId: string): CompletionHistoryInsert[] {
  return items.map(h => ({
    chain_id: h.chainId,
    completed_at: h.completedAt.toISOString(),
    duration: h.duration,
    was_successful: h.wasSuccessful,
    reason_for_failure: h.reasonForFailure ?? null,
    description: h.description ?? null,
    notes: h.notes ?? null,
    user_id: userId,
  }));
}

async function insertHistoryWithoutUniqueConstraint(
  client: ReturnType<SupabaseStorageContext['getClient']>,
  userId: string,
  history: CompletionHistory[]
): Promise<void> {
  const { data: existingHistory } = await client
    .from('completion_history')
    .select('chain_id, completed_at')
    .eq('user_id', userId);

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

  let legacyResult = await client.from('completion_history').insert(toRowsWithNewFields(newHistory, userId));
  if (legacyResult.error && isMissingTimingColumnsError(legacyResult.error)) {
    legacyResult = await client.from('completion_history').insert(toRowsBasic(newHistory, userId));
  }

  void legacyResult;
}

async function upsertCompletionHistoryChunk(
  client: ReturnType<SupabaseStorageContext['getClient']>,
  conflictTarget: string,
  userId: string,
  historyChunk: CompletionHistory[],
  mode: 'new' | 'basic'
): Promise<{ error: ErrorWithCodeAndMessage | null; mode: 'new' | 'basic' }> {
  const upsertChunk = (rows: CompletionHistoryInsert[]) =>
    client.from('completion_history').upsert(rows, { onConflict: conflictTarget, ignoreDuplicates: true });

  const basicRows = toRowsBasic(historyChunk, userId);
  if (mode === 'basic') {
    const { error } = await upsertChunk(basicRows);
    return { error: error ?? null, mode };
  }

  const { error } = await upsertChunk(toRowsWithNewFields(historyChunk, userId));
  if (!error) {
    return { error: null, mode };
  }

  if (isMissingTimingColumnsError(error)) {
    const { error: basicError } = await upsertChunk(basicRows);
    return { error: basicError ?? null, mode: 'basic' };
  }

  return { error, mode };
}

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

  if (!error && data) {
    return data.map(mapCompletionHistory);
  }

  if (error && !isMissingTimingColumnsError(error)) return [];

  if (error && isMissingTimingColumnsError(error)) {
    const { data: basicData, error: basicError } = await client
      .from('completion_history')
      .select(selectBasic)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (basicError || !basicData) return [];

    return basicData.map(mapBasicCompletionHistory);
  }

  return [];
}

export async function saveCompletionHistory(ctx: SupabaseStorageContext, history: CompletionHistory[]): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;
  if (history.length === 0) return;

  const client = ctx.getClient();

  const conflictTarget = 'user_id,chain_id,completed_at';
  // Use a modest chunk size to avoid oversized requests (import scenarios).
  const CHUNK_SIZE = 500;

  // Prefer upsert (no prefetch), fall back to legacy insert if the unique index is missing.
  const historyChunks = chunk(history, CHUNK_SIZE);

  // Try once with new fields to detect schema compatibility.
  let mode: 'new' | 'basic' = 'new';

  for (const currentChunk of historyChunks) {
    const result = await upsertCompletionHistoryChunk(client, conflictTarget, user.id, currentChunk, mode);
    mode = result.mode;

    if (!result.error) continue;

    if (isMissingUniqueConstraintError(result.error)) {
      // Legacy schema: no UNIQUE index for ON CONFLICT. Fallback to best-effort insert.
      await insertHistoryWithoutUniqueConstraint(client, user.id, history);
      return;
    }

    // best-effort: ignore other errors
    return;
  }
}

