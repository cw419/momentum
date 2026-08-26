import type { ActiveSession, Chain, CompletionHistory } from '../../types';
import { toError } from '../../utils/errorMessage';
import { logger } from '../../utils/logger';

export type InvalidActiveSessionReason =
  | 'missing-chain'
  | 'invalid-session-data'
  | 'already-finished';

/**
 * A persisted active session can outlive the action that finished it when the
 * completion history write succeeds but the subsequent active-session cleanup
 * fails.  Do not restore those records into the UI: they incorrectly lock the
 * chain editor and send the user back into focus mode.
 */
export function getInvalidActiveSessionReason(
  session: ActiveSession | null,
  chains: Chain[],
  completionHistory: CompletionHistory[],
): InvalidActiveSessionReason | null {
  if (!session) return null;

  if (
    !session.chainId ||
    !Number.isFinite(session.startedAt?.getTime()) ||
    !Number.isFinite(session.duration) ||
    session.duration < 0 ||
    !Number.isFinite(session.totalPausedTime) ||
    session.totalPausedTime < 0
  ) {
    return 'invalid-session-data';
  }

  if (!chains.some((chain) => chain.id === session.chainId)) {
    return 'missing-chain';
  }

  const startedAt = session.startedAt.getTime();
  const hasMatchingCompletion = completionHistory.some(
    (record) =>
      record.chainId === session.chainId &&
      record.startedAt?.getTime() === startedAt &&
      record.completedAt.getTime() >= startedAt,
  );

  return hasMatchingCompletion ? 'already-finished' : null;
}

export async function recoverPersistedActiveSession(params: {
  session: ActiveSession | null;
  chains: Chain[];
  completionHistory: CompletionHistory[];
  clearPersistedSession: () => Promise<void>;
}): Promise<ActiveSession | null> {
  const invalidReason = getInvalidActiveSessionReason(
    params.session,
    params.chains,
    params.completionHistory,
  );
  if (!invalidReason) return params.session;

  logger.warn('APP_SHELL', 'Discarding invalid persisted active session', {
    reason: invalidReason,
    chainId: params.session?.chainId,
  });
  try {
    await params.clearPersistedSession();
  } catch (error) {
    // Keep the stale session out of local UI state even if persistence is
    // temporarily unavailable; the next load will retry cleanup.
    logger.error(
      'APP_SHELL',
      'Failed to clear invalid active session',
      undefined,
      toError(error),
    );
  }
  return null;
}
