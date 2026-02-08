import type { RSIPMeta, RSIPNode, RSIPStabilityPhase } from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';
import { buildRSIPNodeRows } from './rsipPayloadBuilder';

type RSIPNodeRow = Database['public']['Tables']['rsip_nodes']['Row'];
type RSIPMetaRow = Database['public']['Tables']['rsip_meta']['Row'];

const RSIP_NODES_STRICT_COLUMNS_SUPPORTED = new WeakMap<
  SupabaseStorageContext,
  boolean
>();
const RSIP_META_STRICT_COLUMNS_SUPPORTED = new WeakMap<
  SupabaseStorageContext,
  boolean
>();

function isMissingRSIPNodeStrictColumns(error: {
  code?: string;
  message?: string;
}): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('schema cache') ||
    message.includes('emoji') ||
    message.includes('stability_phase') ||
    message.includes('phase_started_at') ||
    message.includes('last_executed_at') ||
    message.includes('last_violated_at') ||
    message.includes('consecutive_executions') ||
    message.includes('consecutive_violations') ||
    message.includes('total_executions') ||
    message.includes('total_violations')
  );
}

function isMissingRSIPMetaStrictColumns(error: {
  code?: string;
  message?: string;
}): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('schema cache') ||
    message.includes('last_tree_opened_at') ||
    message.includes('daily_tree_open_required') ||
    message.includes('tree_open_streak')
  );
}

export async function getRSIPNodes(
  ctx: SupabaseStorageContext,
): Promise<RSIPNode[]> {
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
    emoji: row.emoji ?? undefined,
    stabilityPhase: (row.stability_phase as RSIPStabilityPhase) || 'E0',
    phaseStartedAt: row.phase_started_at
      ? new Date(row.phase_started_at)
      : undefined,
    lastExecutedAt: row.last_executed_at
      ? new Date(row.last_executed_at)
      : undefined,
    lastViolatedAt: row.last_violated_at
      ? new Date(row.last_violated_at)
      : undefined,
    consecutiveExecutions: row.consecutive_executions ?? 0,
    consecutiveViolations: row.consecutive_violations ?? 0,
    totalExecutions: row.total_executions ?? 0,
    totalViolations: row.total_violations ?? 0,
  }));
}

export async function saveRSIPNodes(
  ctx: SupabaseStorageContext,
  nodes: RSIPNode[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();
  const strictColumnsSupported = RSIP_NODES_STRICT_COLUMNS_SUPPORTED.get(ctx);

  const rows = buildRSIPNodeRows(nodes, user.id, { strict: true });
  const rowsBasic = buildRSIPNodeRows(nodes, user.id, { strict: false });

  const { data: existingRows, error: existingErr } = await client
    .from('rsip_nodes')
    .select('id')
    .eq('user_id', user.id);
  if (existingErr) {
    throw new Error(`Failed to query RSIP nodes: ${existingErr.message}`);
  }

  const existingIds = new Set((existingRows || []).map((r) => r.id));
  const newIds = new Set(nodes.map((n) => n.id));
  const idsToDelete = [...existingIds].filter((id) => !newIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: delErr } = await client
      .from('rsip_nodes')
      .delete()
      .in('id', idsToDelete)
      .eq('user_id', user.id);
    if (delErr) {
      throw new Error(`Failed to delete removed RSIP nodes: ${delErr.message}`);
    }
  }

  const primaryRows = strictColumnsSupported === false ? rowsBasic : rows;
  const { error } = await client
    .from('rsip_nodes')
    .upsert(primaryRows, { onConflict: 'id' });
  if (!error) {
    if (strictColumnsSupported == null && primaryRows === rows) {
      RSIP_NODES_STRICT_COLUMNS_SUPPORTED.set(ctx, true);
    }
    return;
  }

  if (primaryRows === rowsBasic) {
    throw new Error(`Failed to save RSIP nodes: ${error.message}`);
  }

  if (!isMissingRSIPNodeStrictColumns(error)) {
    throw new Error(`Failed to save RSIP nodes: ${error.message}`);
  }

  RSIP_NODES_STRICT_COLUMNS_SUPPORTED.set(ctx, false);

  const { error: fallbackError } = await client
    .from('rsip_nodes')
    .upsert(rowsBasic, { onConflict: 'id' });
  if (fallbackError) {
    throw new Error(`Failed to save RSIP nodes: ${fallbackError.message}`);
  }
}

export async function getRSIPMeta(
  ctx: SupabaseStorageContext,
): Promise<RSIPMeta> {
  const user = await ctx.getCurrentUser();
  if (!user) return {};

  const client = ctx.getClient();
  const { data, error } = await client
    .from('rsip_meta')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);
  if (error || !data || data.length === 0) return {};

  const row = data[0] as RSIPMetaRow;
  return {
    lastAddedAt: row.last_added_at ? new Date(row.last_added_at) : undefined,
    allowMultiplePerDay: !!row.allow_multiple_per_day,
    // 新增字段（严格模式）
    lastTreeOpenedAt: row.last_tree_opened_at
      ? new Date(row.last_tree_opened_at)
      : undefined,
    dailyTreeOpenRequired: row.daily_tree_open_required ?? false,
    treeOpenStreak: row.tree_open_streak ?? 0,
  };
}

export async function saveRSIPMeta(
  ctx: SupabaseStorageContext,
  meta: RSIPMeta,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();
  const strictColumnsSupported = RSIP_META_STRICT_COLUMNS_SUPPORTED.get(ctx);

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

  if (strictColumnsSupported === false) {
    const { error } = await client
      .from('rsip_meta')
      .upsert(baseData, { onConflict: 'user_id' });
    if (error) {
      throw new Error(`Failed to save RSIP meta: ${error.message}`);
    }
    return;
  }

  const { error } = await client
    .from('rsip_meta')
    .upsert(fullData, { onConflict: 'user_id' });

  if (!error) {
    RSIP_META_STRICT_COLUMNS_SUPPORTED.set(ctx, true);
    return;
  }

  if (error) {
    if (isMissingRSIPMetaStrictColumns(error)) {
      RSIP_META_STRICT_COLUMNS_SUPPORTED.set(ctx, false);
    }
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
