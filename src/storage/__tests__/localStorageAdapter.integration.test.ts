import { beforeEach, describe, expect, it } from 'vitest';
import { localStorageAdapter } from '../localStorageAdapter';
import { createUnitChain } from '../../test/factories/chainFactory';

describe('localStorageAdapter integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and hydrates chain data round-trip', async () => {
    const chains = [
      createUnitChain({
        id: 'chain-a',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      createUnitChain({
        id: 'chain-b',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ];

    await localStorageAdapter.saveChains(chains);
    const loaded = await localStorageAdapter.getChains();

    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toMatchObject({ id: 'chain-a' });
    expect(loaded[1]).toMatchObject({ id: 'chain-b' });
    expect(loaded[0].createdAt).toBeInstanceOf(Date);
    expect(loaded[1].createdAt).toBeInstanceOf(Date);
  });

  it('supports soft delete, restore and permanent delete flow', async () => {
    await localStorageAdapter.saveChains([createUnitChain({ id: 'chain-1' })]);

    await localStorageAdapter.softDeleteChain('chain-1');
    expect(await localStorageAdapter.getActiveChains()).toHaveLength(0);

    const deleted = await localStorageAdapter.getDeletedChains();
    expect(deleted).toHaveLength(1);
    expect(deleted[0].deletedAt).toBeInstanceOf(Date);

    await localStorageAdapter.restoreChain('chain-1');
    expect(await localStorageAdapter.getActiveChains()).toHaveLength(1);

    await localStorageAdapter.softDeleteChain('chain-1');
    await localStorageAdapter.permanentlyDeleteChain('chain-1');

    expect(await localStorageAdapter.getChains()).toHaveLength(0);
    expect(await localStorageAdapter.getDeletedChains()).toHaveLength(0);
  });

  it('cleans up expired deleted chains', async () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const oldDate = new Date(Date.now() - 31 * dayMs);
    const recentDate = new Date(Date.now() - 29 * dayMs);

    await localStorageAdapter.saveChains([
      createUnitChain({ id: 'old-deleted', deletedAt: oldDate }),
      createUnitChain({ id: 'recent-deleted', deletedAt: recentDate }),
    ]);

    const cleaned = await localStorageAdapter.cleanupExpiredDeletedChains(30);
    const remainingDeleted = await localStorageAdapter.getDeletedChains();

    expect(cleaned).toBe(1);
    expect(remainingDeleted).toHaveLength(1);
    expect(remainingDeleted[0].id).toBe('recent-deleted');
  });
});
