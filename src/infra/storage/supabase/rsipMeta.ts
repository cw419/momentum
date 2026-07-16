import type { RSIPMeta } from '../../../types';
import type { Database } from '../../../lib/database.types';
import { mapRSIPMetaRow } from './rsipMapper';
import { buildRSIPMetaRow } from './rsipPayloadBuilder';
import type { SupabaseStorageContext } from './types';

type RSIPMetaRow = Database['public']['Tables']['rsip_meta']['Row'];

export async function getRSIPMeta(
  ctx: SupabaseStorageContext,
): Promise<RSIPMeta> {
  const user = await ctx.getCurrentUser();
  if (!user) return {};

  const { data, error } = await ctx
    .getClient()
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

  const { error } = await ctx
    .getClient()
    .from('rsip_meta')
    .upsert(buildRSIPMetaRow(meta, user.id), { onConflict: 'user_id' });
  if (error) {
    throw new Error(`Failed to save RSIP meta: ${error.message}`);
  }
}
