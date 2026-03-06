import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPStabilityPhase,
  RSIPTaskLink,
} from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';
import { buildRSIPNodeRows } from './rsipPayloadBuilder';

type RSIPNodeRow = Database['public']['Tables']['rsip_nodes']['Row'];
type RSIPMetaRow = Database['public']['Tables']['rsip_meta']['Row'];

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

type OrderedRowsResult = {
  userId: string | null;
  rows: Record<string, unknown>[];
};

type OrderedRowsClient = {
  from: (tableName: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{
          data: Record<string, unknown>[] | null;
          error: SupabaseLikeError | null;
        }>;
      };
    };
  };
};

const RSIP_NODES_STRICT_COLUMNS_SUPPORTED = new WeakMap<
  SupabaseStorageContext,
  boolean
>();
const RSIP_META_STRICT_COLUMNS_SUPPORTED = new WeakMap<
  SupabaseStorageContext,
  boolean
>();

function isSchemaMissing(error: SupabaseLikeError): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    code === '42P01' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find')
  );
}

function isMissingRSIPNodeStrictColumns(error: SupabaseLikeError): boolean {
  const message = error.message ?? '';

  return (
    isSchemaMissing(error) ||
    message.includes('emoji') ||
    message.includes('type') ||
    message.includes('group_id') ||
    message.includes('reinforcement_level') ||
    message.includes('max_reinforcement_level') ||
    message.includes('cumulative_execution_days') ||
    message.includes('is_passive') ||
    message.includes('split_from_goal') ||
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

function isMissingRSIPMetaStrictColumns(error: SupabaseLikeError): boolean {
  const message = error.message ?? '';

  return (
    isSchemaMissing(error) ||
    message.includes('last_tree_opened_at') ||
    message.includes('daily_tree_open_required') ||
    message.includes('tree_open_streak') ||
    message.includes('current_run_number') ||
    message.includes('current_run_started_at')
  );
}

function asDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

async function replaceUserScopedRows(
  ctx: SupabaseStorageContext,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient() as unknown as {
    from: (tableName: string) => {
      delete: () => {
        eq: (
          column: string,
          value: string,
        ) => Promise<{ error: SupabaseLikeError | null }>;
      };
      insert: (
        payload: Record<string, unknown>[],
      ) => Promise<{ error: SupabaseLikeError | null }>;
    };
  };

  const { error: deleteError } = await client
    .from(table)
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    if (isSchemaMissing(deleteError)) {
      return;
    }
    throw new Error(`Failed to clear ${table}: ${deleteError.message}`);
  }

  if (rows.length === 0) return;

  const { error: insertError } = await client.from(table).insert(rows);
  if (insertError) {
    if (isSchemaMissing(insertError)) {
      return;
    }
    throw new Error(`Failed to save ${table}: ${insertError.message}`);
  }
}

async function getUserScopedOrderedRows(
  ctx: SupabaseStorageContext,
  options: {
    table: string;
    orderBy: string;
    ascending: boolean;
    errorLabel: string;
  },
): Promise<OrderedRowsResult> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    return { userId: null, rows: [] };
  }

  const client = ctx.getClient() as unknown as OrderedRowsClient;
  const { data, error } = await client
    .from(options.table)
    .select('*')
    .eq('user_id', user.id)
    .order(options.orderBy, { ascending: options.ascending });

  if (error) {
    if (isSchemaMissing(error)) {
      return { userId: user.id, rows: [] };
    }
    throw new Error(`Failed to load ${options.errorLabel}: ${error.message}`);
  }

  return {
    userId: user.id,
    rows: data ?? [],
  };
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

  return (data || []).map((row: RSIPNodeRow) => {
    const rowAny = row as unknown as Record<string, unknown>;

    return {
      id: row.id,
      parentId: row.parent_id || undefined,
      title: row.title,
      rule: row.rule,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      useTimer: row.use_timer ?? false,
      timerMinutes: row.timer_minutes ?? undefined,
      emoji: (rowAny.emoji as string | null) ?? undefined,
      type: (rowAny.type as string | null) ?? undefined,
      groupId: (rowAny.group_id as string | null) ?? undefined,
      reinforcementLevel:
        (rowAny.reinforcement_level as number | null) ?? undefined,
      maxReinforcementLevel:
        (rowAny.max_reinforcement_level as number | null) ?? undefined,
      cumulativeExecutionDays:
        (rowAny.cumulative_execution_days as number | null) ?? undefined,
      isPassive: (rowAny.is_passive as boolean | null) ?? undefined,
      splitFromGoal: (rowAny.split_from_goal as string | null) ?? undefined,
      stabilityPhase: (rowAny.stability_phase as RSIPStabilityPhase) || 'E0',
      phaseStartedAt: asDate(rowAny.phase_started_at),
      lastExecutedAt: asDate(rowAny.last_executed_at),
      lastViolatedAt: asDate(rowAny.last_violated_at),
      consecutiveExecutions:
        (rowAny.consecutive_executions as number | null) ?? 0,
      consecutiveViolations:
        (rowAny.consecutive_violations as number | null) ?? 0,
      totalExecutions: (rowAny.total_executions as number | null) ?? 0,
      totalViolations: (rowAny.total_violations as number | null) ?? 0,
    };
  });
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
  const rowAny = row as unknown as Record<string, unknown>;
  return {
    lastAddedAt: row.last_added_at ? new Date(row.last_added_at) : undefined,
    allowMultiplePerDay: !!row.allow_multiple_per_day,
    lastTreeOpenedAt: rowAny.last_tree_opened_at
      ? new Date(rowAny.last_tree_opened_at as string)
      : undefined,
    dailyTreeOpenRequired:
      (rowAny.daily_tree_open_required as boolean) ?? false,
    treeOpenStreak: (rowAny.tree_open_streak as number) ?? 0,
    currentRunNumber: (rowAny.current_run_number as number | null) ?? undefined,
    currentRunStartedAt: asDate(rowAny.current_run_started_at),
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

  const baseData = {
    user_id: user.id,
    last_added_at: meta.lastAddedAt ? meta.lastAddedAt.toISOString() : null,
    allow_multiple_per_day: !!meta.allowMultiplePerDay,
  };

  const fullData = {
    ...baseData,
    last_tree_opened_at: meta.lastTreeOpenedAt?.toISOString() ?? null,
    daily_tree_open_required: meta.dailyTreeOpenRequired ?? false,
    tree_open_streak: meta.treeOpenStreak ?? 0,
    current_run_number: meta.currentRunNumber ?? null,
    current_run_started_at: meta.currentRunStartedAt?.toISOString() ?? null,
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

  if (isMissingRSIPMetaStrictColumns(error)) {
    RSIP_META_STRICT_COLUMNS_SUPPORTED.set(ctx, false);
  }

  const { error: fallbackError } = await client
    .from('rsip_meta')
    .upsert(baseData, { onConflict: 'user_id' });

  if (fallbackError) {
    throw new Error(`Failed to save RSIP meta: ${fallbackError.message}`);
  }
}

export async function getRSIPGroups(
  ctx: SupabaseStorageContext,
): Promise<RSIPNodeGroup[]> {
  const { rows } = await getUserScopedOrderedRows(ctx, {
    table: 'rsip_groups',
    orderBy: 'created_at',
    ascending: true,
    errorLabel: 'rsip groups',
  });

  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    faultTolerance: Number(row.fault_tolerance ?? 0),
    emoji: (row.emoji as string | null) ?? undefined,
    createdAt: asDate(row.created_at) ?? new Date(),
  }));
}

export async function saveRSIPGroups(
  ctx: SupabaseStorageContext,
  groups: RSIPNodeGroup[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  await replaceUserScopedRows(
    ctx,
    'rsip_groups',
    groups.map((group) => ({
      id: group.id,
      user_id: user.id,
      title: group.title,
      fault_tolerance: group.faultTolerance,
      emoji: group.emoji ?? null,
      created_at: group.createdAt.toISOString(),
    })),
  );
}

export async function getRSIPPolicyLibrary(
  ctx: SupabaseStorageContext,
): Promise<RSIPLibraryEntry[]> {
  const { rows } = await getUserScopedOrderedRows(ctx, {
    table: 'rsip_policy_library',
    orderBy: 'updated_at',
    ascending: false,
    errorLabel: 'rsip policy library',
  });

  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    rule: String(row.rule ?? ''),
    type: (row.type as string | null) ?? undefined,
    emoji: (row.emoji as string | null) ?? undefined,
    cumulativeExecutionDays: Number(row.cumulative_execution_days ?? 0),
    internalizationProgress: Number(row.internalization_progress ?? 0),
    lastActiveAt: asDate(row.last_active_at) ?? new Date(),
    timesUsed: Number(row.times_used ?? 0),
    useTimer: Boolean(row.use_timer ?? false),
    timerMinutes:
      row.timer_minutes == null ? undefined : Number(row.timer_minutes),
    isPassive: Boolean(row.is_passive ?? false),
  }));
}

export async function saveRSIPPolicyLibrary(
  ctx: SupabaseStorageContext,
  entries: RSIPLibraryEntry[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  await replaceUserScopedRows(
    ctx,
    'rsip_policy_library',
    entries.map((entry) => ({
      id: entry.id,
      user_id: user.id,
      title: entry.title,
      rule: entry.rule,
      type: entry.type ?? null,
      emoji: entry.emoji ?? null,
      cumulative_execution_days: entry.cumulativeExecutionDays,
      internalization_progress: entry.internalizationProgress,
      last_active_at: entry.lastActiveAt.toISOString(),
      times_used: entry.timesUsed,
      use_timer: entry.useTimer ?? false,
      timer_minutes: entry.timerMinutes ?? null,
      is_passive: entry.isPassive ?? false,
      updated_at: new Date().toISOString(),
    })),
  );
}

export async function getRSIPRunHistory(
  ctx: SupabaseStorageContext,
): Promise<RSIPRunRecord[]> {
  const { rows } = await getUserScopedOrderedRows(ctx, {
    table: 'rsip_run_history',
    orderBy: 'run_number',
    ascending: false,
    errorLabel: 'rsip run history',
  });

  return rows.map((row) => ({
    runNumber: Number(row.run_number ?? 0),
    startedAt: asDate(row.started_at) ?? new Date(),
    endedAt: asDate(row.ended_at),
    maxNodeCount: Number(row.max_node_count ?? 0),
    durationDays: Number(row.duration_days ?? 0),
    collapseReason: (row.collapse_reason as string | null) ?? undefined,
    collapseNodeTitle: (row.collapse_node_title as string | null) ?? undefined,
  }));
}

export async function saveRSIPRunHistory(
  ctx: SupabaseStorageContext,
  records: RSIPRunRecord[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  await replaceUserScopedRows(
    ctx,
    'rsip_run_history',
    records.map((record) => ({
      user_id: user.id,
      run_number: record.runNumber,
      started_at: record.startedAt.toISOString(),
      ended_at: record.endedAt?.toISOString() ?? null,
      max_node_count: record.maxNodeCount,
      duration_days: record.durationDays,
      collapse_reason: record.collapseReason ?? null,
      collapse_node_title: record.collapseNodeTitle ?? null,
      updated_at: new Date().toISOString(),
    })),
  );
}

export async function getRSIPTaskLinks(
  ctx: SupabaseStorageContext,
): Promise<RSIPTaskLink[]> {
  const { userId, rows } = await getUserScopedOrderedRows(ctx, {
    table: 'rsip_task_links',
    orderBy: 'updated_at',
    ascending: false,
    errorLabel: 'rsip task links',
  });

  if (!userId) return [];

  return rows.map((row) => ({
    id: String(row.id),
    userId,
    rsipNodeId: String(row.rsip_node_id),
    chainId: String(row.chain_id),
    chainKind: (row.chain_kind as 'group' | 'unit') ?? 'unit',
    triggerEvent: row.trigger_event as RSIPTaskLink['triggerEvent'],
    effect: row.effect as RSIPTaskLink['effect'],
    automation: (row.automation as RSIPTaskLink['automation']) ?? 'confirm',
    isActive: Boolean(row.is_active ?? true),
    updatedAt: asDate(row.updated_at) ?? new Date(),
  }));
}

export async function saveRSIPTaskLinks(
  ctx: SupabaseStorageContext,
  links: RSIPTaskLink[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  await replaceUserScopedRows(
    ctx,
    'rsip_task_links',
    links.map((link) => ({
      id: link.id,
      user_id: user.id,
      rsip_node_id: link.rsipNodeId,
      chain_id: link.chainId,
      chain_kind: link.chainKind,
      trigger_event: link.triggerEvent,
      effect: link.effect,
      automation: link.automation,
      is_active: link.isActive,
      updated_at: link.updatedAt.toISOString(),
    })),
  );
}

// === 执行记录 CRUD 操作（严格模式）===

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

  return rows.map((row) => ({
    id: String(row.id),
    userId,
    nodeId: String(row.node_id),
    executedAt: asDate(row.executed_at) ?? new Date(),
    status: (row.status as RSIPExecutionRecord['status']) ?? 'pending',
    notes: (row.notes as string | null) ?? undefined,
    reasonCode: (row.reason_code as string | null) ?? undefined,
    repairHint: (row.repair_hint as string | null) ?? undefined,
    sourceChainId: (row.source_chain_id as string | null) ?? undefined,
    sourceEvent: (row.source_event as string | null) ?? undefined,
  }));
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
