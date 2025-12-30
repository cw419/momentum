import type { Chain, DeletedChain } from '../../../types';
import { logger } from '../../../utils/logger';
import type { SupabaseStorageContext, SchemaVerificationResult } from './types';
import { buildChainRow, mapChainRowToChain } from './mappers';

function formatDbError(error: any): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;

  const parts: string[] = [];
  if (error.code) parts.push(`code=${String(error.code)}`);
  if (error.message) parts.push(String(error.message));
  if (error.details) parts.push(`details=${String(error.details)}`);
  if (error.hint) parts.push(`hint=${String(error.hint)}`);

  return parts.length > 0 ? parts.join(' | ') : String(error);
}

function findChainAndChildren(chainId: string, allChains: Chain[]): Chain[] {
  const result: Chain[] = [];
  const visited = new Set<string>();

  const findRecursive = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);

    const chain = allChains.find(c => c.id === id);
    if (chain) {
      result.push(chain);
      const children = allChains.filter(c => c.parentId === id);
      children.forEach(child => findRecursive(child.id));
    }
  };

  findRecursive(chainId);
  return result;
}

export async function getChains(ctx: SupabaseStorageContext): Promise<Chain[]> {
  const user = await ctx.getCurrentUser();
  if (!user) {
    logger.warn('SUPABASE_STORAGE', 'getChains: User not authenticated');
    return [];
  }

  try {
    const client = ctx.getClient();
    const { data, error } = await client
      .from('chains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('SUPABASE_STORAGE', 'Failed to get chains data', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
      });

      if (
        error.code === 'PGRST116' ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist')
      ) {
        return [];
      }

      throw new Error(`Failed to fetch chains: ${error.message}`);
    }

    const chainCount = data?.length || 0;
    logger.dbOperation('getChains', true, { chainCount, userId: user.id });

    return (data || []).map(mapChainRowToChain);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.warn('SUPABASE_STORAGE', 'getChains failed; returning empty array', { message: errorObj.message });
    return [];
  }
}

export async function getActiveChains(ctx: SupabaseStorageContext): Promise<Chain[]> {
  const allChains = await getChains(ctx);
  return allChains.filter(chain => chain.deletedAt == null);
}

export async function getDeletedChains(ctx: SupabaseStorageContext): Promise<DeletedChain[]> {
  try {
    const allChains = await getChains(ctx);
    const deletedChains = allChains.filter(chain => chain.deletedAt != null);

    return deletedChains
      .map(chain => ({ ...chain, deletedAt: chain.deletedAt! }))
      .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  } catch (error) {
    logger.warn('SUPABASE_STORAGE', 'Failed to get deleted chains', { error });
    return [];
  }
}

export async function softDeleteChain(ctx: SupabaseStorageContext, chainId: string): Promise<void> {
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
        chainsToDelete.map(c => c.id)
      )
      .eq('user_id', user.id);

    if (error) {
      if (error.code === '42703' || error.message?.includes('deleted_at') || error.code === 'PGRST204') {
        logger.warn('SUPABASE_STORAGE', 'Database does not support soft delete; falling back to permanent delete');
        await permanentlyDeleteChain(ctx, chainId);
        return;
      }
      throw new Error(`Soft delete chain failed: ${error.message}`);
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (errorObj.message.includes('deleted_at') || errorObj.message.includes('PGRST204')) {
      logger.warn('SUPABASE_STORAGE', 'Database does not support soft delete; falling back to permanent delete');
      await permanentlyDeleteChain(ctx, chainId);
      return;
    }
    throw errorObj;
  }
}

export async function restoreChain(ctx: SupabaseStorageContext, chainId: string): Promise<void> {
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
        chainsToRestore.map(c => c.id)
      )
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      if (error.code === '42703' || error.message?.includes('deleted_at') || error.code === 'PGRST204') {
        throw new Error('Database does not support soft delete, cannot restore deleted chains');
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

export async function permanentlyDeleteChain(ctx: SupabaseStorageContext, chainId: string): Promise<void> {
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
      chainsToDelete.map(c => c.id)
    )
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Permanent delete chain failed: ${error.message}`);
  }
}

export async function cleanupExpiredDeletedChains(ctx: SupabaseStorageContext, olderThanDays: number = 30): Promise<number> {
  const user = await ctx.getCurrentUser();
  if (!user) return 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const client = ctx.getClient();
    const { data: expiredChains, error: selectError } = await client
      .from('chains')
      .select('id')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate.toISOString());

    if (selectError) {
      if (selectError.code === '42703' || selectError.message?.includes('deleted_at does not exist')) {
        return 0;
      }
      throw new Error(`Failed to find expired chains: ${selectError.message}`);
    }

    if (!expiredChains || expiredChains.length === 0) return 0;

    const { error: deleteError } = await client
      .from('chains')
      .delete()
      .in(
        'id',
        expiredChains.map(c => c.id)
      )
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error(`Failed to cleanup expired chains: ${deleteError.message}`);
    }

    return expiredChains.length;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (errorObj.message.includes('deleted_at does not exist')) {
      return 0;
    }
    throw errorObj;
  }
}

export async function saveChains(ctx: SupabaseStorageContext, chains: Chain[]): Promise<void> {
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

  const schemaCheck: SchemaVerificationResult = {
    hasAllColumns: true,
    missingColumns: [],
    error: 'Schema verification simplified for reliable imports',
  };
  void schemaCheck;

  const rowsWithNew = chains.map(c => buildChainRow(c, user.id, true));
  const rowsBase = chains.map(c => buildChainRow(c, user.id, false));

  const isMissingColumnError = (e: any) => {
    if (!e) return false;
    const msg = `${e.message || ''} ${e.details || ''}`.toLowerCase();
    const code = e.code || '';

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

    return patterns.some(p => p.test(msg)) || errorCodes.includes(code);
  };

  const client = ctx.getClient();

  const { data: existingRows, error: existingErr } = await client
    .from('chains')
    .select('id')
    .eq('user_id', user.id);
  if (existingErr) {
    throw new Error(`Failed to query existing chains: ${formatDbError(existingErr)}`);
  }
  const existingIds = new Set((existingRows || []).map(r => r.id as string));

  const tryUpsert = async (rows: any[]) => {
    return await ctx.retryWithAuth(async () => {
      const { data, error } = await client.from('chains').upsert(rows, { onConflict: 'id' }).select('id');
      if (error) throw error;
      return { data, error } as { data: { id: string }[] | null; error: any };
    });
  };

  let upsertResultIds: string[] = [];
  let upsertData1: any = null;
  let upsertErr1: any = null;

  try {
    const result = await tryUpsert(rowsWithNew);
    upsertData1 = result.data;
  } catch (error) {
    upsertErr1 = error;
  }

  if (upsertErr1 && isMissingColumnError(upsertErr1)) {
    const result = await tryUpsert(rowsBase);
    upsertResultIds = (result.data || []).map(r => r.id);
  } else if (upsertErr1) {
    throw new Error(`Failed to save chains: ${formatDbError(upsertErr1)}`);
  } else {
    upsertResultIds = (upsertData1 || []).map((r: { id: string }) => r.id);
  }

  const newIds = new Set(chains.map(c => c.id));
  const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: delErr } = await client.from('chains').delete().in('id', idsToDelete).eq('user_id', user.id);
    if (delErr) {
      throw new Error(`Failed to delete extra chains: ${formatDbError(delErr)}`);
    }
  }

  const savedIds = new Set(upsertResultIds);
  const expectedIds = new Set(chains.map(c => c.id));
  const missingSavedIds = [...expectedIds].filter(id => !savedIds.has(id));
  if (missingSavedIds.length > 0) {
    logger.warn('SUPABASE_STORAGE', 'Some saved ids missing from result', { missingSavedIds });
  }
}

