import type { RSIPMeta, RSIPNode } from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';

type RSIPNodeRow = Database['public']['Tables']['rsip_nodes']['Row'];
type RSIPMetaRow = Database['public']['Tables']['rsip_meta']['Row'];

export async function getRSIPNodes(ctx: SupabaseStorageContext): Promise<RSIPNode[]> {
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
  }));
}

export async function saveRSIPNodes(ctx: SupabaseStorageContext, nodes: RSIPNode[]): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();

  const rows = nodes.map(n => ({
    id: n.id,
    parent_id: n.parentId || null,
    title: n.title,
    rule: n.rule,
    sort_order: n.sortOrder,
    created_at: n.createdAt.toISOString(),
    use_timer: n.useTimer ?? false,
    timer_minutes: n.timerMinutes ?? null,
    user_id: user.id,
  }));

  const { data: existingRows, error: existingErr } = await client.from('rsip_nodes').select('id').eq('user_id', user.id);
  if (existingErr) {
    throw new Error(`Failed to query RSIP nodes: ${existingErr.message}`);
  }

  const existingIds = new Set((existingRows || []).map(r => r.id));
  const newIds = new Set(nodes.map(n => n.id));
  const idsToDelete = [...existingIds].filter(id => !newIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: delErr } = await client.from('rsip_nodes').delete().in('id', idsToDelete).eq('user_id', user.id);
    if (delErr) {
      throw new Error(`Failed to delete removed RSIP nodes: ${delErr.message}`);
    }
  }

  const { error } = await client.from('rsip_nodes').upsert(rows, { onConflict: 'id' });
  if (error) {
    throw new Error(`Failed to save RSIP nodes: ${error.message}`);
  }
}

export async function getRSIPMeta(ctx: SupabaseStorageContext): Promise<RSIPMeta> {
  const user = await ctx.getCurrentUser();
  if (!user) return {};

  const client = ctx.getClient();
  const { data, error } = await client.from('rsip_meta').select('*').eq('user_id', user.id).limit(1);
  if (error || !data || data.length === 0) return {};

  const row = data[0] as RSIPMetaRow;
  return {
    lastAddedAt: row.last_added_at ? new Date(row.last_added_at) : undefined,
    allowMultiplePerDay: !!row.allow_multiple_per_day,
  };
}

export async function saveRSIPMeta(ctx: SupabaseStorageContext, meta: RSIPMeta): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();
  const { error } = await client.from('rsip_meta').upsert(
    {
      user_id: user.id,
      last_added_at: meta.lastAddedAt ? meta.lastAddedAt.toISOString() : null,
      allow_multiple_per_day: !!meta.allowMultiplePerDay,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(`Failed to save RSIP meta: ${error.message}`);
  }
}

