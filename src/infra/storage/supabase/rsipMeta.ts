import type { RSIPMeta } from '../../../types';
import type { Database } from '../../../lib/database.types';
import { mapRSIPMetaRow } from './rsipMapper';
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
    .upsert(
      {
        user_id: user.id,
        last_added_at: meta.lastAddedAt?.toISOString() ?? null,
        allow_multiple_per_day: !!meta.allowMultiplePerDay,
        last_tree_opened_at: meta.lastTreeOpenedAt?.toISOString() ?? null,
        daily_tree_open_required: meta.dailyTreeOpenRequired ?? false,
        tree_open_streak: meta.treeOpenStreak ?? 0,
        current_run_number: meta.currentRunNumber ?? null,
        current_run_started_at: meta.currentRunStartedAt?.toISOString() ?? null,
      },
      { onConflict: 'user_id' },
    );
  if (error) {
    throw new Error(`Failed to save RSIP meta: ${error.message}`);
  }
}
