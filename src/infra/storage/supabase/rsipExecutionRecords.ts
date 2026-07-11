import type { RSIPExecutionRecord } from '../../../types';
import { mapRSIPExecutionRecordRow } from './rsipMapper';
import {
  isSchemaMissing,
  type SupabaseLikeError,
} from './rsipNodeCapabilities';
import { getUserScopedOrderedRows } from './rsipShared';
import type { SupabaseStorageContext } from './types';

export async function getRSIPExecutionRecords(
  ctx: SupabaseStorageContext,
): Promise<RSIPExecutionRecord[]> {
  const { userId, rows } = await getUserScopedOrderedRows(ctx, {
    table: 'rsip_execution_records',
    orderBy: 'executed_at',
    ascending: false,
    errorLabel: 'rsip execution records',
  });
  if (!userId) return [];
  return rows.map((row) => mapRSIPExecutionRecordRow(row, userId));
}

export async function appendRSIPExecutionRecord(
  ctx: SupabaseStorageContext,
  record: RSIPExecutionRecord,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient() as unknown as {
    from: (tableName: string) => {
      insert: (
        payload: Record<string, unknown>,
      ) => Promise<{ error: SupabaseLikeError | null }>;
    };
  };
  const { error } = await client.from('rsip_execution_records').insert({
    id: record.id,
    user_id: user.id,
    node_id: record.nodeId,
    executed_at: record.executedAt.toISOString(),
    status: record.status,
    notes: record.notes ?? null,
    reason_code: record.reasonCode ?? null,
    repair_hint: record.repairHint ?? null,
    source_chain_id: record.sourceChainId ?? null,
    source_event: record.sourceEvent ?? null,
  });
  if (error) {
    if (isSchemaMissing(error)) return;
    throw new Error(`Failed to append rsip execution record: ${error.message}`);
  }
}
