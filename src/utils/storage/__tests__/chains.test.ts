import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGroupChain, createUnitChain } from '../../../test/factories';
import {
  cleanupExpiredDeletedChains,
  getActiveChains,
  getChains,
  getDeletedChains,
  permanentlyDeleteChain,
  restoreChain,
  saveChains,
  softDeleteChain,
} from '../chains';
import { STORAGE_KEYS } from '../keys';

describe('storage/chains', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('returns empty array when chains are missing', () => {
    expect(getChains()).toEqual([]);
    expect(getActiveChains()).toEqual([]);
    expect(getDeletedChains()).toEqual([]);
  });

  it('hydrates date fields and default legacy values', () => {
    localStorage.setItem(
      STORAGE_KEYS.CHAINS,
      JSON.stringify([
        {
          ...createUnitChain({
            id: 'legacy',
            auxiliaryStreak: undefined as unknown as number,
            auxiliaryFailures: undefined as unknown as number,
            auxiliaryExceptions: undefined as unknown as string[],
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            lastCompletedAt: new Date('2026-01-02T00:00:00.000Z'),
          }),
          deletedAt: null,
        },
      ])
    );

    const [chain] = getChains();
    expect(chain).toBeDefined();
    expect(chain.auxiliaryStreak).toBe(0);
    expect(chain.auxiliaryFailures).toBe(0);
    expect(chain.auxiliaryExceptions).toEqual([]);
    expect(chain.createdAt).toBeInstanceOf(Date);
    expect(chain.lastCompletedAt).toBeInstanceOf(Date);
    expect(chain.deletedAt).toBeNull();
  });

  it('preserves existing auxiliary values when they are present', () => {
    localStorage.setItem(
      STORAGE_KEYS.CHAINS,
      JSON.stringify([
        {
          ...createUnitChain({
            id: 'non-defaults',
            auxiliaryStreak: 3,
            auxiliaryFailures: 4,
            auxiliaryExceptions: ['rule-a'],
            createdAt: new Date('2026-01-03T00:00:00.000Z'),
          }),
        },
      ])
    );

    const [chain] = getChains();
    expect(chain.auxiliaryStreak).toBe(3);
    expect(chain.auxiliaryFailures).toBe(4);
    expect(chain.auxiliaryExceptions).toEqual(['rule-a']);
  });

  it('keeps active/deleted buckets separated and sorts deleted chains by deletion time desc', () => {
    const active = createUnitChain({ id: 'active-1', deletedAt: null });
    const olderDeleted = createUnitChain({
      id: 'deleted-older',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const newerDeleted = createUnitChain({
      id: 'deleted-newer',
      deletedAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    saveChains([active, olderDeleted, newerDeleted]);

    expect(getActiveChains().map((chain) => chain.id)).toEqual(['active-1']);
    expect(getDeletedChains().map((chain) => chain.id)).toEqual(['deleted-newer', 'deleted-older']);
  });

  it('soft-deletes and restores root + descendants only', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T10:00:00.000Z'));

    const root = createGroupChain({ id: 'root', parentId: undefined, deletedAt: null });
    const child = createUnitChain({ id: 'child', parentId: 'root', deletedAt: null });
    const grandChild = createUnitChain({ id: 'grand', parentId: 'child', deletedAt: null });
    const outsider = createUnitChain({ id: 'outsider', parentId: undefined, deletedAt: null });
    saveChains([root, child, grandChild, outsider]);

    softDeleteChain('root');
    const deletedIds = getDeletedChains().map((chain) => chain.id);
    expect(deletedIds).toEqual(expect.arrayContaining(['root', 'child', 'grand']));
    expect(deletedIds).not.toContain('outsider');

    restoreChain('root');
    expect(getDeletedChains()).toHaveLength(0);
    expect(getActiveChains().map((chain) => chain.id).sort()).toEqual(['child', 'grand', 'outsider', 'root']);
  });

  it('restores only target subtree and keeps unrelated deleted chains untouched', () => {
    const root = createGroupChain({ id: 'restore-root', parentId: undefined, deletedAt: new Date() });
    const child = createUnitChain({ id: 'restore-child', parentId: 'restore-root', deletedAt: new Date() });
    const unrelatedDeleted = createUnitChain({
      id: 'already-deleted',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    saveChains([root, child, unrelatedDeleted]);

    restoreChain('restore-root');

    const deletedIds = getDeletedChains().map((chain) => chain.id);
    expect(deletedIds).toEqual(['already-deleted']);
    expect(getActiveChains().map((chain) => chain.id).sort()).toEqual(['restore-child', 'restore-root']);
  });

  it('permanently deletes root + descendants', () => {
    const root = createGroupChain({ id: 'root' });
    const child = createUnitChain({ id: 'child', parentId: 'root' });
    const outsider = createUnitChain({ id: 'outsider' });
    saveChains([root, child, outsider]);

    permanentlyDeleteChain('root');
    expect(getChains().map((chain) => chain.id)).toEqual(['outsider']);
  });

  it('cleans up expired deleted chains based on threshold', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T00:00:00.000Z'));

    saveChains([
      createUnitChain({ id: 'keep-active', deletedAt: null }),
      createUnitChain({ id: 'keep-recent', deletedAt: new Date('2026-02-07T00:00:00.000Z') }),
      createUnitChain({ id: 'delete-old', deletedAt: new Date('2026-01-01T00:00:00.000Z') }),
    ]);

    const removedCount = cleanupExpiredDeletedChains(7);
    expect(removedCount).toBe(1);
    expect(getChains().map((chain) => chain.id).sort()).toEqual(['keep-active', 'keep-recent']);
  });

  it('uses strict cutoff semantics for deletedAt timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T00:00:00.000Z'));
    const exactCutoff = new Date('2026-02-03T00:00:00.000Z');
    const justBeforeCutoff = new Date('2026-02-02T23:59:59.999Z');

    saveChains([
      createUnitChain({ id: 'exact-cutoff', deletedAt: exactCutoff }),
      createUnitChain({ id: 'before-cutoff', deletedAt: justBeforeCutoff }),
      createUnitChain({ id: 'active', deletedAt: null }),
    ]);

    const removed = cleanupExpiredDeletedChains(7);

    expect(removed).toBe(1);
    expect(getChains().map((chain) => chain.id).sort()).toEqual(['active', 'exact-cutoff']);
  });
});
