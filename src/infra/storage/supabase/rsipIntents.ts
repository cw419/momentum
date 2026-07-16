import type {
  RSIPArchiveNodesResult,
  RSIPCreateNodesResult,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPRunRecord,
} from '../../../types';
import type { Database } from '../../../lib/database.types';
import { RSIPAtomicIntentError } from '../../../storage/rsipAtomicError';
import {
  buildRSIPLibraryRows,
  buildRSIPMetaRow,
  buildRSIPNodeRows,
} from './rsipPayloadBuilder';
import type { SupabaseStorageContext } from './types';
import {
  mapRSIPLibraryEntryRow,
  mapRSIPMetaRow,
  mapRSIPNodeRow,
} from './rsipMapper';
import { rsipMetaRowSchema, rsipNodeRowSchema } from './rsipRowSchema';
import {
  isSchemaMissing,
  RSIP_NODES_TABLE,
  type SupabaseLikeError,
} from './rsipNodeCapabilities';

type UpsertClient = {
  from: (tableName: string) => {
    upsert: (
      payload: Record<string, unknown> | Record<string, unknown>[],
      options?: { onConflict?: string },
    ) => Promise<{ error: SupabaseLikeError | null }>;
    delete: () => {
      in: (
        column: string,
        values: string[],
      ) => {
        eq: (
          column: string,
          value: string,
        ) => Promise<{ error: SupabaseLikeError | null }>;
      };
    };
    insert: (
      payload: Record<string, unknown>,
    ) => Promise<{ error: SupabaseLikeError | null }>;
  };
};

type RSIPNodeRow = Database['public']['Tables']['rsip_nodes']['Row'];
type RSIPMetaRow = Database['public']['Tables']['rsip_meta']['Row'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function intentKey(nodeIds: string[]): string {
  return [...new Set(nodeIds)].sort().join(',') || 'empty';
}

function atomicRpcError(label: string, error: SupabaseLikeError) {
  const code = error.code?.trim() || undefined;
  return new RSIPAtomicIntentError(`${label}: ${error.message}`, {
    code,
    isOutcomeAmbiguous: code === undefined,
    cause: error,
  });
}

function malformedAtomicResult(label: string, cause?: unknown) {
  return new RSIPAtomicIntentError(`${label}: malformed RPC result`, {
    isOutcomeAmbiguous: true,
    cause,
  });
}

function parseCreateResult(data: unknown): RSIPCreateNodesResult {
  if (!isRecord(data) || !Array.isArray(data.nodes)) {
    throw malformedAtomicResult('Failed to create RSIP nodes with metadata');
  }

  try {
    const nodes = data.nodes.map((row) =>
      mapRSIPNodeRow(rsipNodeRowSchema.parse(row) as RSIPNodeRow),
    );
    const meta = mapRSIPMetaRow(
      rsipMetaRowSchema.parse(data.meta) as RSIPMetaRow,
    );
    return { nodes, meta };
  } catch (error) {
    throw malformedAtomicResult(
      'Failed to create RSIP nodes with metadata',
      error,
    );
  }
}

function parseArchiveResult(data: unknown): RSIPArchiveNodesResult {
  if (
    !isRecord(data) ||
    !Array.isArray(data.removed_node_ids) ||
    !data.removed_node_ids.every((id) => typeof id === 'string') ||
    !Array.isArray(data.library_entries) ||
    !data.library_entries.every(isRecord)
  ) {
    throw malformedAtomicResult('Failed to archive and remove RSIP nodes');
  }

  try {
    return {
      removedNodeIds: data.removed_node_ids,
      libraryEntries: data.library_entries.map(mapRSIPLibraryEntryRow),
    };
  } catch (error) {
    throw malformedAtomicResult(
      'Failed to archive and remove RSIP nodes',
      error,
    );
  }
}

export async function createRSIPNodesWithMeta(
  ctx: SupabaseStorageContext,
  newNodes: RSIPNode[],
  nextMeta: RSIPMeta,
): Promise<RSIPCreateNodesResult> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    throw new Error('Cannot atomically create RSIP nodes without a user');
  }

  const uniqueIds = new Set(newNodes.map((node) => node.id));
  if (uniqueIds.size !== newNodes.length) {
    throw new Error('Cannot atomically create duplicate RSIP node ids');
  }

  const { data, error } = await ctx
    .getClient()
    .rpc('create_rsip_nodes_with_meta', {
      p_intent_key: intentKey(newNodes.map((node) => node.id)),
      p_nodes: buildRSIPNodeRows(newNodes, user.id),
      p_meta: buildRSIPMetaRow(nextMeta, user.id),
    });
  if (error) {
    throw atomicRpcError(
      'Failed to create RSIP nodes with metadata',
      error,
    );
  }
  return parseCreateResult(data);
}

export async function archiveRSIPNodesAndRemove(
  ctx: SupabaseStorageContext,
  nodeIds: string[],
  _nextLibrary: RSIPLibraryEntry[],
): Promise<RSIPArchiveNodesResult> {
  const uniqueNodeIds = [...new Set(nodeIds)];
  if (uniqueNodeIds.length === 0) {
    return { removedNodeIds: [], libraryEntries: [] };
  }

  const user = await ctx.getCurrentUser();
  if (!user) {
    throw new Error('Cannot atomically archive RSIP nodes without a user');
  }

  const { data, error } = await ctx
    .getClient()
    .rpc('archive_rsip_nodes_and_remove', {
      p_intent_key: intentKey(uniqueNodeIds),
      p_node_ids: uniqueNodeIds,
    });
  if (error) {
    throw atomicRpcError(
      'Failed to archive and remove RSIP nodes',
      error,
    );
  }
  return parseArchiveResult(data);
}

export async function upsertRSIPNode(
  ctx: SupabaseStorageContext,
  node: RSIPNode,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    return;
  }

  const client = ctx.getClient() as unknown as UpsertClient;
  const row = buildRSIPNodeRows([node], user.id)[0];

  const { error } = await client
    .from(RSIP_NODES_TABLE)
    .upsert(row, { onConflict: 'id' });
  if (error) {
    throw new Error(`Failed to upsert RSIP node: ${error.message}`);
  }
}

export async function removeRSIPNodes(
  ctx: SupabaseStorageContext,
  nodeIds: string[],
): Promise<void> {
  if (nodeIds.length === 0) {
    return;
  }

  const user = await ctx.getCurrentUser();
  if (!user) {
    return;
  }

  const client = ctx.getClient() as unknown as UpsertClient;
  const { error } = await client
    .from(RSIP_NODES_TABLE)
    .delete()
    .in('id', nodeIds)
    .eq('user_id', user.id);

  if (error) {
    if (isSchemaMissing(error)) {
      return;
    }
    throw new Error(`Failed to remove RSIP nodes: ${error.message}`);
  }
}

export async function upsertRSIPLibraryEntry(
  ctx: SupabaseStorageContext,
  entry: RSIPLibraryEntry,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    return;
  }

  const client = ctx.getClient() as unknown as UpsertClient;
  const { error } = await client
    .from('rsip_policy_library')
    .upsert(buildRSIPLibraryRows([entry], user.id)[0], {
      onConflict: 'user_id,id',
    });

  if (error) {
    if (isSchemaMissing(error)) {
      return;
    }
    throw new Error(`Failed to upsert RSIP library entry: ${error.message}`);
  }
}

export async function appendRSIPRunRecord(
  ctx: SupabaseStorageContext,
  record: RSIPRunRecord,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    return;
  }

  const client = ctx.getClient() as unknown as UpsertClient;
  const { error } = await client.from('rsip_run_history').insert({
    user_id: user.id,
    run_number: record.runNumber,
    started_at: record.startedAt.toISOString(),
    ended_at: record.endedAt?.toISOString() ?? null,
    max_node_count: record.maxNodeCount,
    duration_days: record.durationDays,
    collapse_reason: record.collapseReason ?? null,
    collapse_node_title: record.collapseNodeTitle ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (isSchemaMissing(error)) {
      return;
    }
    throw new Error(
      `Failed to append rsip run history record: ${error.message}`,
    );
  }
}
