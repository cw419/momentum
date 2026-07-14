import type { CompletionHistory } from '../../../types';
import type { SupabaseClient, SupabaseStorageContext } from './types';
import {
  buildCompletionHistoryRowsBasic,
  buildCompletionHistoryRowsWithNewFields,
  mapBasicCompletionHistoryRow,
  mapCompletionHistoryRow,
  type CompletionHistoryBasicRow,
  type CompletionHistorySelectRow,
} from './historyMapper';

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

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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
    .insert(buildCompletionHistoryRowsWithNewFields(userId, newHistory));
  if (legacyResult.error && isMissingTimingColumns(legacyResult.error)) {
    await client
      .from('completion_history')
      .insert(buildCompletionHistoryRowsBasic(userId, newHistory));
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
    return (data as CompletionHistorySelectRow[]).map(mapCompletionHistoryRow);
  }

  if (error && !isMissingTimingColumns(error)) return [];

  const { data: basicData, error: basicError } = await client
    .from('completion_history')
    .select(selectBasic)
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });

  if (basicError || !basicData) return [];

  return (basicData as CompletionHistoryBasicRow[]).map(
    mapBasicCompletionHistoryRow,
  );
}

async function persistCompletionHistory(
  ctx: SupabaseStorageContext,
  userId: string,
  history: CompletionHistory[],
): Promise<void> {
  if (history.length === 0) return;

  const client = ctx.getClient();

  // Try once with new fields to detect schema compatibility.
  let mode: 'new' | 'basic' = 'new';

  for (const currentChunk of chunk(history, COMPLETION_HISTORY_CHUNK_SIZE)) {
    const rows =
      mode === 'new'
        ? buildCompletionHistoryRowsWithNewFields(userId, currentChunk)
        : buildCompletionHistoryRowsBasic(userId, currentChunk);
    let { error } = await client.from('completion_history').upsert(rows, {
      onConflict: COMPLETION_HISTORY_CONFLICT_TARGET,
      ignoreDuplicates: true,
    });

    if (!error) continue;

    if (isMissingTimingColumns(error)) {
      mode = 'basic';
      ({ error } = await client
        .from('completion_history')
        .upsert(buildCompletionHistoryRowsBasic(userId, currentChunk), {
          onConflict: COMPLETION_HISTORY_CONFLICT_TARGET,
          ignoreDuplicates: true,
        }));
      if (!error) continue;
    }

    if (isMissingUniqueConstraint(error)) {
      // Legacy schema: no UNIQUE index for ON CONFLICT. Fallback to best-effort insert.
      await insertCompletionHistoryLegacy(client, userId, history);
      return;
    }

    // best-effort: ignore other errors
    return;
  }
}

export async function saveCompletionHistory(
  ctx: SupabaseStorageContext,
  history: CompletionHistory[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const { error } = await ctx
    .getClient()
    .from('completion_history')
    .delete()
    .eq('user_id', user.id);
  if (error) return;

  await persistCompletionHistory(ctx, user.id, history);
}

export async function appendCompletionHistory(
  ctx: SupabaseStorageContext,
  record: CompletionHistory,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;
  await persistCompletionHistory(ctx, user.id, [record]);
}
