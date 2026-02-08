import type { CompletionHistory } from '../../../types';
import type { SupabaseClient, SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';

type CompletionHistoryRow =
  Database['public']['Tables']['completion_history']['Row'];
type CompletionHistoryInsert =
  Database['public']['Tables']['completion_history']['Insert'];

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

const COMPLETION_HISTORY_CONFLICT_TARGET = 'user_id,chain_id,completed_at';
const COMPLETION_HISTORY_CHUNK_SIZE = 500;

function isMissingUniqueConstraint(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === '42P10' ||
    error.message?.includes('no unique or exclusion constraint matching') ===
      true
  );
}

function isMissingTimingColumns(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.message?.includes('actual_duration') === true ||
    error.message?.includes('is_forward_timed') === true
  );
}

function mapCompletionHistory(
  history: CompletionHistorySelectRow,
): CompletionHistory {
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

function mapBasicCompletionHistory(
  history: CompletionHistoryBasicRow,
): CompletionHistory {
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

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toRowsWithNewFields(
  userId: string,
  items: CompletionHistory[],
): CompletionHistoryInsert[] {
  return items.map((history) => ({
    chain_id: history.chainId,
    completed_at: history.completedAt.toISOString(),
    duration: history.duration,
    was_successful: history.wasSuccessful,
    reason_for_failure: history.reasonForFailure ?? null,
    actual_duration: history.actualDuration ?? history.duration,
    is_forward_timed: history.isForwardTimed ?? false,
    description: history.description ?? null,
    notes: history.notes ?? null,
    user_id: userId,
  }));
}

function toRowsBasic(
  userId: string,
  items: CompletionHistory[],
): CompletionHistoryInsert[] {
  return items.map((history) => ({
    chain_id: history.chainId,
    completed_at: history.completedAt.toISOString(),
    duration: history.duration,
    was_successful: history.wasSuccessful,
    reason_for_failure: history.reasonForFailure ?? null,
    description: history.description ?? null,
    notes: history.notes ?? null,
    user_id: userId,
  }));
}

async function insertCompletionHistoryLegacy(
  client: SupabaseClient,
  userId: string,
  history: CompletionHistory[],
): Promise<void> {
  const { data: existingHistory } = await client
    .from('completion_history')
    .select('chain_id, completed_at')
    .eq('user_id', userId);

  const existingKeys = new Set(
    (existingHistory || []).map(
      (item: { chain_id: string; completed_at: string }) => {
        const normalizedTime = new Date(item.completed_at).getTime();
        return `${item.chain_id}-${normalizedTime}`;
      },
    ),
  );

  const newHistory = history.filter((item) => {
    const normalizedTime = item.completedAt.getTime();
    const key = `${item.chainId}-${normalizedTime}`;
    return !existingKeys.has(key);
  });

  if (newHistory.length === 0) return;

  const legacyResult = await client
    .from('completion_history')
    .insert(toRowsWithNewFields(userId, newHistory));
  if (legacyResult.error && isMissingTimingColumns(legacyResult.error)) {
    await client
      .from('completion_history')
      .insert(toRowsBasic(userId, newHistory));
  }
}

export async function getCompletionHistory(
  ctx: SupabaseStorageContext,
): Promise<CompletionHistory[]> {
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
    return (data as CompletionHistorySelectRow[]).map(mapCompletionHistory);
  }

  if (error && !isMissingTimingColumns(error)) return [];

  const { data: basicData, error: basicError } = await client
    .from('completion_history')
    .select(selectBasic)
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });

  if (basicError || !basicData) return [];

  return (basicData as CompletionHistoryBasicRow[]).map(
    mapBasicCompletionHistory,
  );
}

export async function saveCompletionHistory(
  ctx: SupabaseStorageContext,
  history: CompletionHistory[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;
  if (history.length === 0) return;

  const client = ctx.getClient();

  // Try once with new fields to detect schema compatibility.
  let mode: 'new' | 'basic' = 'new';

  for (const currentChunk of chunk(history, COMPLETION_HISTORY_CHUNK_SIZE)) {
    const rows =
      mode === 'new'
        ? toRowsWithNewFields(user.id, currentChunk)
        : toRowsBasic(user.id, currentChunk);
    let { error } = await client.from('completion_history').upsert(rows, {
      onConflict: COMPLETION_HISTORY_CONFLICT_TARGET,
      ignoreDuplicates: true,
    });

    if (!error) continue;

    if (isMissingTimingColumns(error)) {
      mode = 'basic';
      ({ error } = await client
        .from('completion_history')
        .upsert(toRowsBasic(user.id, currentChunk), {
          onConflict: COMPLETION_HISTORY_CONFLICT_TARGET,
          ignoreDuplicates: true,
        }));
      if (!error) continue;
    }

    if (isMissingUniqueConstraint(error)) {
      // Legacy schema: no UNIQUE index for ON CONFLICT. Fallback to best-effort insert.
      await insertCompletionHistoryLegacy(client, user.id, history);
      return;
    }

    // best-effort: ignore other errors
    return;
  }
}
