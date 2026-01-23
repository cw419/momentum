import type { ActiveSession, ScheduledSession } from '../../../types';
import type { SupabaseStorageContext } from './types';
import type { Database } from '../../../lib/database.types';
import { formatSupabaseError } from './supabaseError';

type ActiveSessionRow = Database['public']['Tables']['active_sessions']['Row'];
type ActiveSessionInsert = Database['public']['Tables']['active_sessions']['Insert'];

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
  const { data, error } = await client
    .from('active_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;

  const sessionData = data[0] as ActiveSessionRow;
  return {
    id: sessionData.id,
    chainId: sessionData.chain_id,
    startedAt: new Date(sessionData.started_at),
    duration: sessionData.duration,
    isPaused: sessionData.is_paused,
    pausedAt: sessionData.paused_at ? new Date(sessionData.paused_at) : undefined,
    totalPausedTime: sessionData.total_paused_time,
    isForwardTimer: sessionData.is_forward_timer ?? false,
    forwardElapsedTime: sessionData.forward_elapsed_time ?? 0,
  };
}

export async function saveActiveSession(ctx: SupabaseStorageContext, session: ActiveSession | null): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient();

  if (!session) {
    const { error } = await client.from('active_sessions').delete().eq('user_id', user.id);
    if (error) {
      throw new Error(formatSupabaseError(error, 'Failed to clear active session'));
    }
    return;
  }

  const sessionId = session.id;

  const payloadBasic: ActiveSessionInsert = {
    id: sessionId,
    chain_id: session.chainId,
    started_at: session.startedAt.toISOString(),
    duration: session.duration,
    is_paused: session.isPaused,
    paused_at: session.pausedAt?.toISOString() ?? null,
    total_paused_time: session.totalPausedTime,
    user_id: user.id,
  };

  const shouldIncludeForwardFields =
    session.isForwardTimer === true || (typeof session.forwardElapsedTime === 'number' && session.forwardElapsedTime > 0);
  const payload: ActiveSessionInsert = { ...payloadBasic };

  if (shouldIncludeForwardFields) {
    payload.is_forward_timer = session.isForwardTimer ?? false;
    payload.forward_elapsed_time = session.forwardElapsedTime ?? 0;
  }

  const { error } = await client.from('active_sessions').upsert(payload, { onConflict: 'id' });

  if (!error) return;

  const errorMessage = error.message || 'Failed to persist active session';
  const errorCode = error.code;

  // If schema lacks forward-timer columns, retry without them.
  const isMissingForwardFields =
    shouldIncludeForwardFields &&
    (errorCode === '42703' ||
      errorCode === 'PGRST204' ||
      errorMessage.includes('is_forward_timer') ||
      errorMessage.includes('forward_elapsed_time'));

  if (isMissingForwardFields) {
    const { error: fallbackError } = await client.from('active_sessions').upsert(payloadBasic, { onConflict: 'id' });
    if (fallbackError) {
      throw new Error(formatSupabaseError(fallbackError, 'Failed to persist active session'));
    }
    return;
  }

  throw new Error(formatSupabaseError(error, errorMessage));
}
