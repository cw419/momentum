import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';
import { buildRSIPNodeRows } from './rsipPayloadBuilder';
import {
  mapRSIPExecutionRecordRow,
  mapRSIPGroupRow,
  mapRSIPLibraryEntryRow,
  mapRSIPMetaRow,
  mapRSIPNodeRow,
  mapRSIPRunRecordRow,
  mapRSIPTaskLinkRow,
} from './rsipMapper';
import {
  cacheMissingCapabilitiesFromError,
  hasKnownMissingCapabilities,
  isMissingSchemaCapabilityError,
  markCapabilitiesAvailable,
} from './schemaCapabilities';

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

const RSIP_NODES_TABLE = 'rsip_nodes';
const RSIP_META_TABLE = 'rsip_meta';

const RSIP_NODE_STRICT_CAPABILITIES = [
  'emoji',
  'type',
  'group_id',
  'reinforcement_level',
  'max_reinforcement_level',
  'cumulative_execution_days',
  'is_passive',
  'split_from_goal',
  'stability_phase',
  'phase_started_at',
  'last_executed_at',
  'last_violated_at',
  'consecutive_executions',
  'consecutive_violations',
  'total_executions',
  'total_violations',
] as const;

const RSIP_META_STRICT_CAPABILITIES = [
  'last_tree_opened_at',
  'daily_tree_open_required',
  'tree_open_streak',
  'current_run_number',
  'current_run_started_at',
] as const;

function isSchemaMissing(error: SupabaseLikeError): boolean {
  return isMissingSchemaCapabilityError(error);
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

  return (data || []).map(mapRSIPNodeRow);
}

export async function saveRSIPNodes(
  ctx: SupabaseStorageContext,
  nodes: RSIPNode[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();
  const shouldSkipStrictColumns = hasKnownMissingCapabilities(
    ctx,
    RSIP_NODES_TABLE,
    RSIP_NODE_STRICT_CAPABILITIES,
  );

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

  const primaryRows = shouldSkipStrictColumns ? rowsBasic : rows;
  const { error } = await client
    .from(RSIP_NODES_TABLE)
    .upsert(primaryRows, { onConflict: 'id' });
  if (!error) {
    if (!shouldSkipStrictColumns) {
      markCapabilitiesAvailable(
        ctx,
        RSIP_NODES_TABLE,
        RSIP_NODE_STRICT_CAPABILITIES,
      );
    }
    return;
  }

  if (primaryRows === rowsBasic) {
    throw new Error(`Failed to save RSIP nodes: ${error.message}`);
  }

  if (!isMissingRSIPNodeStrictColumns(error)) {
    throw new Error(`Failed to save RSIP nodes: ${error.message}`);
  }

  cacheMissingCapabilitiesFromError(
    ctx,
    RSIP_NODES_TABLE,
    RSIP_NODE_STRICT_CAPABILITIES,
    error,
    { markAllOnSchemaError: true },
  );

  const { error: fallbackError } = await client
    .from(RSIP_NODES_TABLE)
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

  return mapRSIPMetaRow(data[0] as RSIPMetaRow);
}

export async function saveRSIPMeta(
  ctx: SupabaseStorageContext,
  meta: RSIPMeta,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();
  const shouldSkipStrictColumns = hasKnownMissingCapabilities(
    ctx,
    RSIP_META_TABLE,
    RSIP_META_STRICT_CAPABILITIES,
  );

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

  if (shouldSkipStrictColumns) {
    const { error } = await client
      .from(RSIP_META_TABLE)
      .upsert(baseData, { onConflict: 'user_id' });
    if (error) {
      throw new Error(`Failed to save RSIP meta: ${error.message}`);
    }
    return;
  }

  const { error } = await client
    .from(RSIP_META_TABLE)
    .upsert(fullData, { onConflict: 'user_id' });

  if (!error) {
    markCapabilitiesAvailable(
      ctx,
      RSIP_META_TABLE,
      RSIP_META_STRICT_CAPABILITIES,
    );
    return;
  }

  if (!isMissingRSIPMetaStrictColumns(error)) {
    throw new Error(`Failed to save RSIP meta: ${error.message}`);
  }

  cacheMissingCapabilitiesFromError(
    ctx,
    RSIP_META_TABLE,
    RSIP_META_STRICT_CAPABILITIES,
    error,
    { markAllOnSchemaError: true },
  );

  const { error: fallbackError } = await client
    .from(RSIP_META_TABLE)
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

  return rows.map(mapRSIPGroupRow);
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

  return rows.map(mapRSIPLibraryEntryRow);
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

  return rows.map(mapRSIPRunRecordRow);
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

  return rows.map((row) => mapRSIPTaskLinkRow(row, userId));
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
