import type { Chain } from '../../../../types';
import type { Database } from '../../../../lib/database.types';
import { toError } from '../../../../utils/errorMessage';
import { logger } from '../../../../utils/logger';
import { buildChainRow } from '../mappers';
import { formatSupabaseError, getSupabaseErrorCode } from '../supabaseError';
import type { SupabaseStorageContext } from '../types';
import { findChainAndChildren, formatDbError } from './internal';
import { getChains } from './queries';

type ChainInsert = Database['public']['Tables']['chains']['Insert'];

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

  const isMissingColumnError = (error: unknown) => {
    const msg = formatSupabaseError(error, '').toLowerCase();
    const code = getSupabaseErrorCode(error) ?? '';

    const patterns = [
      /column .* does not exist/,
      /schema cache/,
      /could not find .* column/,
      /relation .* does not exist/,
      /unknown column/,
      /invalid column name/,
      /column .* not found/,
      /undefined column/,
    ];

    const errorCodes = ['PGRST204', 'PGRST116', '42703', '42P01'];

    return patterns.some((p) => p.test(msg)) || errorCodes.includes(code);
  };

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

  let upsertResultIds: string[] = [];
  let upsertData1: Array<{ id: string }> | null = null;
  let upsertErr1: unknown | null = null;

  try {
    upsertData1 = await tryUpsert(rowsWithNew);
  } catch (error) {
    upsertErr1 = error;
  }

  if (upsertErr1 && isMissingColumnError(upsertErr1)) {
    const result = await tryUpsert(rowsBase);
    upsertResultIds = result.map((r) => r.id);
  } else if (upsertErr1) {
    throw new Error(`Failed to save chains: ${formatDbError(upsertErr1)}`);
  } else {
    upsertResultIds = (upsertData1 || []).map((r) => r.id);
  }

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
