import type { ActiveSession, ScheduledSession } from '../../../types';
import type { SupabaseStorageContext } from './types';

export async function getScheduledSessions(ctx: SupabaseStorageContext): Promise<ScheduledSession[]> {
  const user = await ctx.getCurrentUser();
  if (!user) return [];

  const client = ctx.getClient();
  const { data, error } = await client
    .from('scheduled_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: false });

  if (error) return [];
  if (!data) return [];

  return data.map(session => ({
    chainId: session.chain_id,
    scheduledAt: new Date(session.scheduled_at),
    expiresAt: new Date(session.expires_at),
    auxiliarySignal: session.auxiliary_signal,
  }));
}

export async function saveScheduledSessions(ctx: SupabaseStorageContext, sessions: ScheduledSession[]): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();

  await client.from('scheduled_sessions').delete().eq('user_id', user.id);

  if (sessions.length > 0) {
    const { error } = await client.from('scheduled_sessions').insert(
      sessions.map(session => ({
        chain_id: session.chainId,
        scheduled_at: session.scheduledAt.toISOString(),
        expires_at: session.expiresAt.toISOString(),
        auxiliary_signal: session.auxiliarySignal,
        user_id: user.id,
      }))
    );

    if (error) {
      // best-effort: ignore
    }
  }
}

export async function getActiveSession(ctx: SupabaseStorageContext): Promise<ActiveSession | null> {
  const user = await ctx.getCurrentUser();
  if (!user) return null;

  const client = ctx.getClient();
  const { data, error } = await client.from('active_sessions').select('*').eq('user_id', user.id).limit(1);
  if (error || !data || data.length === 0) return null;

  const sessionData: any = data[0];
  return {
    id: sessionData.id ?? undefined,
    chainId: sessionData.chain_id,
    startedAt: new Date(sessionData.started_at),
    duration: sessionData.duration,
    isPaused: sessionData.is_paused,
    pausedAt: sessionData.paused_at ? new Date(sessionData.paused_at) : undefined,
    totalPausedTime: sessionData.total_paused_time,
    isForwardTimer: Boolean(sessionData.is_forward_timer ?? false),
    forwardElapsedTime: Number(sessionData.forward_elapsed_time ?? 0),
  };
}

export async function saveActiveSession(ctx: SupabaseStorageContext, session: ActiveSession | null): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();

  if (!session) {
    await client.from('active_sessions').delete().eq('user_id', user.id);
    return;
  }

  const sessionId = session.id;

  const payloadWithNewFields: any = {
    ...(sessionId ? { id: sessionId } : {}),
    chain_id: session.chainId,
    started_at: session.startedAt.toISOString(),
    duration: session.duration,
    is_paused: session.isPaused,
    paused_at: session.pausedAt?.toISOString() ?? null,
    total_paused_time: session.totalPausedTime,
    is_forward_timer: session.isForwardTimer ?? false,
    forward_elapsed_time: session.forwardElapsedTime ?? 0,
    user_id: user.id,
  };

  const payloadBasic: any = {
    ...(sessionId ? { id: sessionId } : {}),
    chain_id: session.chainId,
    started_at: session.startedAt.toISOString(),
    duration: session.duration,
    is_paused: session.isPaused,
    paused_at: session.pausedAt?.toISOString() ?? null,
    total_paused_time: session.totalPausedTime,
    user_id: user.id,
  };

  const upsert = async (payload: any) => {
    const { error } = await client.from('active_sessions').upsert(payload, { onConflict: 'id' });
    return error;
  };

  // Try write with new fields first; if schema lacks columns, fallback to basic.
  const error = await upsert(payloadWithNewFields);
  if (error && (error.code === '42703' || error.message?.includes('is_forward_timer') || error.message?.includes('forward_elapsed_time'))) {
    await upsert(payloadBasic);
  }
}
