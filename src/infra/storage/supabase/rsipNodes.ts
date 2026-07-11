import type { RSIPNode } from '../../../types';
import { buildRSIPNodeRows } from './rsipPayloadBuilder';
import { mapRSIPNodeRow } from './rsipMapper';
import { RSIP_NODES_TABLE } from './rsipNodeCapabilities';
import type { SupabaseStorageContext } from './types';

export async function getRSIPNodes(
  ctx: SupabaseStorageContext,
): Promise<RSIPNode[]> {
  const user = await ctx.getCurrentUser();
  if (!user) return [];

  const { data, error } = await ctx
    .getClient()
    .from(RSIP_NODES_TABLE)
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
  const { data: existingRows, error: existingError } = await client
    .from(RSIP_NODES_TABLE)
    .select('id')
    .eq('user_id', user.id);
  if (existingError) {
    throw new Error(`Failed to query RSIP nodes: ${existingError.message}`);
  }

  const existingIds = new Set((existingRows || []).map((row) => row.id));
  const newIds = new Set(nodes.map((node) => node.id));
  const idsToDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (idsToDelete.length > 0) {
    const { error } = await client
      .from(RSIP_NODES_TABLE)
      .delete()
      .in('id', idsToDelete)
      .eq('user_id', user.id);
    if (error) {
      throw new Error(`Failed to delete removed RSIP nodes: ${error.message}`);
    }
  }

  const { error } = await client
    .from(RSIP_NODES_TABLE)
    .upsert(buildRSIPNodeRows(nodes, user.id), { onConflict: 'id' });
  if (error) {
    throw new Error(`Failed to save RSIP nodes: ${error.message}`);
  }
}
