import { describe, expect, it, vi } from 'vitest';
import { createUnitChain } from '../../../test/factories';
import {
  getInvalidActiveSessionReason,
  recoverPersistedActiveSession,
} from '../activeSessionRecovery';

describe('getInvalidActiveSessionReason', () => {
  const chain = createUnitChain({ id: 'chain-1' });
  const session = {
    chainId: chain.id,
    startedAt: new Date('2026-08-26T12:00:00.000Z'),
    duration: 25,
    isPaused: false,
    totalPausedTime: 0,
  };

  it('rejects a session whose chain is no longer active', () => {
    expect(getInvalidActiveSessionReason(session, [], [])).toBe(
      'missing-chain',
    );
  });

  it('rejects a session that already has a completion record', () => {
    expect(
      getInvalidActiveSessionReason(
        session,
        [chain],
        [
          {
            chainId: chain.id,
            startedAt: session.startedAt,
            completedAt: new Date('2026-08-26T12:25:00.000Z'),
            duration: 25,
            wasSuccessful: true,
          },
        ],
      ),
    ).toBe('already-finished');
  });

  it('keeps a valid in-progress session', () => {
    expect(getInvalidActiveSessionReason(session, [chain], [])).toBeNull();
  });

  it('removes a finished session from persistence before returning null', async () => {
    const clearPersistedSession = vi.fn(async () => undefined);

    await expect(
      recoverPersistedActiveSession({
        session,
        chains: [chain],
        completionHistory: [
          {
            chainId: chain.id,
            startedAt: session.startedAt,
            completedAt: new Date('2026-08-26T12:25:00.000Z'),
            duration: 25,
            wasSuccessful: true,
          },
        ],
        clearPersistedSession,
      }),
    ).resolves.toBeNull();

    expect(clearPersistedSession).toHaveBeenCalledOnce();
  });
});
