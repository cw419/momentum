import type { Chain } from '../../../../types';
import type { Database } from '../../../../lib/database.types';
import { toError } from '../../../../utils/errorMessage';
import { logger } from '../../../../utils/logger';
import { buildChainRow } from '../mappers';
import {
  cacheMissingCapabilitiesFromError,
  hasKnownMissingCapabilities,
  isMissingSchemaCapabilityError,
  markCapabilitiesAvailable,
} from '../schemaCapabilities';
import type { SupabaseStorageContext } from '../types';
import { findChainAndChildren, formatDbError } from './internal';
import { getChains } from './queries';

type ChainInsert = Database['public']['Tables']['chains']['Insert'];

const CHAINS_TABLE = 'chains';
const CHAINS_STRICT_CAPABILITIES = [
  'is_durationless',
  'minimum_duration',
  'is_task_group',
  'task_repeat_count',
  'group_repeat_count',
  'time_limit_hours',
  'time_limit_exceptions',
  'group_started_at',
  'group_expires_at',
  'deleted_at',
] as const;

function shouldSkipChainsStrictUpsert(ctx: SupabaseStorageContext): boolean {
  return hasKnownMissingCapabilities(
    ctx,
    CHAINS_TABLE,
    CHAINS_STRICT_CAPABILITIES,
  );
}

function markChainsStrictCapabilitiesAvailable(
  ctx: SupabaseStorageContext,
): void {
  markCapabilitiesAvailable(ctx, CHAINS_TABLE, CHAINS_STRICT_CAPABILITIES);
}

function cacheMissingChainsCapabilities(
  ctx: SupabaseStorageContext,
  error: unknown,
): void {
  cacheMissingCapabilitiesFromError(
    ctx,
    CHAINS_TABLE,
    CHAINS_STRICT_CAPABILITIES,
    error,
    { markAllOnSchemaCacheError: true },
  );
}

function isMissingColumnError(error: unknown): boolean {
  return isMissingSchemaCapabilityError(error);
}

async function upsertChainsWithCapabilityFallback(
  ctx: SupabaseStorageContext,
  client: ReturnType<SupabaseStorageContext['getClient']>,
  rowsWithNew: ChainInsert[],
  rowsBase: ChainInsert[],
): Promise<string[]> {
  const tryUpsert = async (rows: ChainInsert[]) => {
    return await ctx.retryWithAuth(async () => {
      const { data, error } = await client
        .from('chains')
        .upsert(rows, { onConflict: 'id' })
        .select('id');
      if (error) throw error;
      return (data || []) as Array<{ id: string }>;
    });
  };

  if (shouldSkipChainsStrictUpsert(ctx)) {
    const result = await tryUpsert(rowsBase);
    return result.map((row) => row.id);
  }

  try {
    const strictResult = await tryUpsert(rowsWithNew);
    markChainsStrictCapabilitiesAvailable(ctx);
    return strictResult.map((row) => row.id);
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw new Error(`Failed to save chains: ${formatDbError(error)}`);
    }

    cacheMissingChainsCapabilities(ctx, error);
    const fallbackResult = await tryUpsert(rowsBase);
    return fallbackResult.map((row) => row.id);
  }
}

export async function softDeleteChain(
  ctx: SupabaseStorageContext,
  chainId: string,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const allChains = await getChains(ctx);
  const chainsToDelete = findChainAndChildren(chainId, allChains);

  try {
    const client = ctx.getClient();
    const { error } = await client
      .from('chains')
      .update({ deleted_at: new Date().toISOString() })
      .in(
        'id',
        chainsToDelete.map((c) => c.id),
      )
      .eq('user_id', user.id);

    if (error) {
      if (
        error.code === '42703' ||
        error.message?.includes('deleted_at') ||
        error.code === 'PGRST204'
      ) {
        logger.warn(
          'SUPABASE_STORAGE',
          'Database does not support soft delete; falling back to permanent delete',
        );
        await permanentlyDeleteChain(ctx, chainId);
        return;
      }
      throw new Error(`Soft delete chain failed: ${error.message}`);
    }
  } catch (error) {
    const errorObj = toError(error);
    if (
      errorObj.message.includes('deleted_at') ||
      errorObj.message.includes('PGRST204')
    ) {
      logger.warn(
        'SUPABASE_STORAGE',
        'Database does not support soft delete; falling back to permanent delete',
      );
      await permanentlyDeleteChain(ctx, chainId);
      return;
    }
    throw errorObj;
  }
}

export async function restoreChain(
  ctx: SupabaseStorageContext,
  chainId: string,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const allChains = await getChains(ctx);
  const chainsToRestore = findChainAndChildren(chainId, allChains);

  const client = ctx.getClient();
  const restoreOperation = async () => {
    const { data, error } = await client
      .from('chains')
      .update({ deleted_at: null })
      .in(
        'id',
        chainsToRestore.map((c) => c.id),
      )
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      if (
        error.code === '42703' ||
        error.message?.includes('deleted_at') ||
        error.code === 'PGRST204'
      ) {
        throw new Error(
          'Database does not support soft delete, cannot restore deleted chains',
        );
      }
      throw new Error(`Restore chain failed: ${error.message}`);
    }

    const restoredCount = data?.length || 0;
    if (restoredCount !== chainsToRestore.length) {
      logger.warn('SUPABASE_STORAGE', 'Partial restore', {
        expected: chainsToRestore.length,
        restored: restoredCount,
        chainId,
      });
    }
  };

  await ctx.retryOperation(restoreOperation, 2, 500);
  ctx.clearSchemaCache();
}

export async function permanentlyDeleteChain(
  ctx: SupabaseStorageContext,
  chainId: string,
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const allChains = await getChains(ctx);
  const chainsToDelete = findChainAndChildren(chainId, allChains);

  const client = ctx.getClient();
  const { error } = await client
    .from('chains')
    .delete()
    .in(
      'id',
      chainsToDelete.map((c) => c.id),
    )
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Permanent delete chain failed: ${error.message}`);
  }
}

export async function saveChains(
  ctx: SupabaseStorageContext,
  chains: Chain[],
): Promise<void> {
  const { user, isAuthenticated } = await ctx.waitForAuthentication(10000);
  if (!isAuthenticated || !user) {
    throw new Error('User authentication failed or timed out');
  }

  const idCounts = new Map<string, number>();
  for (const chain of chains) {
    const count = idCounts.get(chain.id) || 0;
    idCounts.set(chain.id, count + 1);
    if (count > 0) {
      throw new Error(`Duplicate chain id detected: ${chain.id}`);
    }
  }

  const rowsWithNew = chains.map((c) => buildChainRow(c, user.id, true));
  const rowsBase = chains.map((c) => buildChainRow(c, user.id, false));

  const client = ctx.getClient();

  const { data: existingRows, error: existingErr } = await client
    .from('chains')
    .select('id')
    .eq('user_id', user.id);
  if (existingErr) {
    throw new Error(
      `Failed to query existing chains: ${formatDbError(existingErr)}`,
    );
  }
  const existingIds = new Set((existingRows || []).map((r) => r.id));
  const upsertResultIds = await upsertChainsWithCapabilityFallback(
    ctx,
    client,
    rowsWithNew,
    rowsBase,
  );

  const newIds = new Set(chains.map((c) => c.id));
  const idsToDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: delErr } = await client
      .from('chains')
      .delete()
      .in('id', idsToDelete)
      .eq('user_id', user.id);
    if (delErr) {
      throw new Error(
        `Failed to delete extra chains: ${formatDbError(delErr)}`,
      );
    }
  }

  const savedIds = new Set(upsertResultIds);
  const expectedIds = new Set(chains.map((c) => c.id));
  const missingSavedIds = [...expectedIds].filter((id) => !savedIds.has(id));
  if (missingSavedIds.length > 0) {
    logger.warn('SUPABASE_STORAGE', 'Some saved ids missing from result', {
      missingSavedIds,
    });
  }
}

export async function upsertChain(
  ctx: SupabaseStorageContext,
  chain: Chain,
): Promise<void> {
  const { user, isAuthenticated } = await ctx.waitForAuthentication(10000);
  if (!isAuthenticated || !user) {
    throw new Error('User authentication failed or timed out');
  }

  const rowsWithNew = [buildChainRow(chain, user.id, true)];
  const rowsBase = [buildChainRow(chain, user.id, false)];
  const client = ctx.getClient();

  const upsertedIds = await upsertChainsWithCapabilityFallback(
    ctx,
    client,
    rowsWithNew,
    rowsBase,
  );

  if (!upsertedIds.includes(chain.id)) {
    logger.warn('SUPABASE_STORAGE', 'Upserted chain id missing from result', {
      chainId: chain.id,
    });
  }
}
