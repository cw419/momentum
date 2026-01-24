import type { RSIPMeta, RSIPNode, RSIPExecutionRecord, RSIPStabilityPhase } from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';

type RSIPNodeRow = Database['public']['Tables']['rsip_nodes']['Row'];
type RSIPMetaRow = Database['public']['Tables']['rsip_meta']['Row'];

export async function getRSIPNodes(ctx: SupabaseStorageContext): Promise<RSIPNode[]> {
  const user = await ctx.getCurrentUser();
  if (!user) return [];

  const client = ctx.getClient();
  const { data, error } = await client
    .from('rsip_nodes')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) return [];

  return (data || []).map((row: RSIPNodeRow) => ({
    id: row.id,
    parentId: row.parent_id || undefined,
    title: row.title,
    rule: row.rule,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    useTimer: row.use_timer ?? false,
    timerMinutes: row.timer_minutes ?? undefined,
    // 新增字段（严格模式）
    emoji: (row as Record<string, unknown>).emoji as string | undefined,
    stabilityPhase: ((row as Record<string, unknown>).stability_phase as RSIPStabilityPhase) || 'E0',
    phaseStartedAt: (row as Record<string, unknown>).phase_started_at
      ? new Date((row as Record<string, unknown>).phase_started_at as string)
      : undefined,
    lastExecutedAt: (row as Record<string, unknown>).last_executed_at
      ? new Date((row as Record<string, unknown>).last_executed_at as string)
      : undefined,
    lastViolatedAt: (row as Record<string, unknown>).last_violated_at
      ? new Date((row as Record<string, unknown>).last_violated_at as string)
      : undefined,
    consecutiveExecutions: ((row as Record<string, unknown>).consecutive_executions as number) ?? 0,
    consecutiveViolations: ((row as Record<string, unknown>).consecutive_violations as number) ?? 0,
    totalExecutions: ((row as Record<string, unknown>).total_executions as number) ?? 0,
    totalViolations: ((row as Record<string, unknown>).total_violations as number) ?? 0,
  }));
}

export async function saveRSIPNodes(ctx: SupabaseStorageContext, nodes: RSIPNode[]): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();

  const rows = nodes.map(n => ({
    id: n.id,
    parent_id: n.parentId || null,
    title: n.title,
    rule: n.rule,
    sort_order: n.sortOrder,
    created_at: n.createdAt.toISOString(),
    use_timer: n.useTimer ?? false,
    timer_minutes: n.timerMinutes ?? null,
    user_id: user.id,
    // 新增字段（严格模式）
    emoji: n.emoji ?? null,
    stability_phase: n.stabilityPhase ?? 'E0',
    phase_started_at: n.phaseStartedAt?.toISOString() ?? null,
    last_executed_at: n.lastExecutedAt?.toISOString() ?? null,
    last_violated_at: n.lastViolatedAt?.toISOString() ?? null,
    consecutive_executions: n.consecutiveExecutions ?? 0,
    consecutive_violations: n.consecutiveViolations ?? 0,
    total_executions: n.totalExecutions ?? 0,
    total_violations: n.totalViolations ?? 0,
  }));

  const { data: existingRows, error: existingErr } = await client.from('rsip_nodes').select('id').eq('user_id', user.id);
  if (existingErr) {
    throw new Error(`Failed to query RSIP nodes: ${existingErr.message}`);
  }

  const existingIds = new Set((existingRows || []).map(r => r.id));
  const newIds = new Set(nodes.map(n => n.id));
  const idsToDelete = [...existingIds].filter(id => !newIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: delErr } = await client.from('rsip_nodes').delete().in('id', idsToDelete).eq('user_id', user.id);
    if (delErr) {
      throw new Error(`Failed to delete removed RSIP nodes: ${delErr.message}`);
    }
  }

  const { error } = await client.from('rsip_nodes').upsert(rows, { onConflict: 'id' });
  if (error) {
    throw new Error(`Failed to save RSIP nodes: ${error.message}`);
  }
}

export async function getRSIPMeta(ctx: SupabaseStorageContext): Promise<RSIPMeta> {
  const user = await ctx.getCurrentUser();
  if (!user) return {};

  const client = ctx.getClient();
  const { data, error } = await client.from('rsip_meta').select('*').eq('user_id', user.id).limit(1);
  if (error || !data || data.length === 0) return {};

  const row = data[0] as RSIPMetaRow;
  const extRow = row as Record<string, unknown>;
  return {
    lastAddedAt: row.last_added_at ? new Date(row.last_added_at) : undefined,
    allowMultiplePerDay: !!row.allow_multiple_per_day,
    // 新增字段（严格模式）
    lastTreeOpenedAt: extRow.last_tree_opened_at
      ? new Date(extRow.last_tree_opened_at as string)
      : undefined,
    dailyTreeOpenRequired: (extRow.daily_tree_open_required as boolean) ?? false,
    treeOpenStreak: (extRow.tree_open_streak as number) ?? 0,
  };
}

export async function saveRSIPMeta(ctx: SupabaseStorageContext, meta: RSIPMeta): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();

  // 基础字段（始终保存）
  const baseData = {
    user_id: user.id,
    last_added_at: meta.lastAddedAt ? meta.lastAddedAt.toISOString() : null,
    allow_multiple_per_day: !!meta.allowMultiplePerDay,
  };

  // 尝试保存包含新字段的完整数据
  const fullData = {
    ...baseData,
    last_tree_opened_at: meta.lastTreeOpenedAt?.toISOString() ?? null,
    daily_tree_open_required: meta.dailyTreeOpenRequired ?? false,
    tree_open_streak: meta.treeOpenStreak ?? 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any).from('rsip_meta').upsert(fullData, { onConflict: 'user_id' });

  if (error) {
    // 如果失败（可能是新列不存在），尝试只保存基础字段
    const { error: fallbackError } = await client
      .from('rsip_meta')
      .upsert(baseData, { onConflict: 'user_id' });

    if (fallbackError) {
      throw new Error(`Failed to save RSIP meta: ${fallbackError.message}`);
    }
  }
}

// === 执行记录 CRUD 操作（严格模式）===
// 注意：rsip_execution_records 表在迁移后需要重新生成数据库类型
// 在此之前使用类型断言绕过类型检查

export async function getRSIPExecutionRecords(
  ctx: SupabaseStorageContext
): Promise<RSIPExecutionRecord[]> {
  const user = await ctx.getCurrentUser();
  if (!user) return [];

  const client = ctx.getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('rsip_execution_records')
    .select('*')
    .eq('user_id', user.id)
    .order('executed_at', { ascending: false });

  if (error) return [];

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    nodeId: row.node_id as string,
    executedAt: new Date(row.executed_at as string),
    status: row.status as RSIPExecutionRecord['status'],
    notes: row.notes as string | undefined,
  }));
}

export async function saveRSIPExecutionRecord(
  ctx: SupabaseStorageContext,
  record: Omit<RSIPExecutionRecord, 'id' | 'userId'>
): Promise<RSIPExecutionRecord | null> {
  const user = await ctx.getCurrentUser();
  if (!user) return null;

  const client = ctx.getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('rsip_execution_records')
    .insert({
      user_id: user.id,
      node_id: record.nodeId,
      executed_at: record.executedAt.toISOString(),
      status: record.status,
      notes: record.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save execution record: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    nodeId: data.node_id,
    executedAt: new Date(data.executed_at),
    status: data.status,
    notes: data.notes ?? undefined,
  };
}

export async function deleteRSIPExecutionRecords(
  ctx: SupabaseStorageContext,
  nodeIds: string[]
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user || nodeIds.length === 0) return;

  const client = ctx.getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('rsip_execution_records')
    .delete()
    .eq('user_id', user.id)
    .in('node_id', nodeIds);

  if (error) {
    throw new Error(`Failed to delete execution records: ${error.message}`);
  }
}
