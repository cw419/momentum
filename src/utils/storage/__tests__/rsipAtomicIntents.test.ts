import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RSIPLibraryEntry, RSIPNode } from '../../../types';
import { STORAGE_KEYS } from '../keys';
import {
  archiveRSIPNodesAndRemove,
  createRSIPNodesWithMeta,
} from '../rsipAtomicIntents';
import {
  getRSIPMeta,
  getRSIPNodes,
  getRSIPPolicyLibrary,
  saveRSIPMeta,
  saveRSIPNodes,
  saveRSIPPolicyLibrary,
} from '../rsip';

const CREATED_AT = new Date('2026-07-16T00:00:00.000Z');
const QUOTA_ERROR_MESSAGE = 'Storage quota exhausted';
const QUOTA_ERROR_NAME = 'QuotaExceededError';

function makeNode(id: string, sortOrder = 0): RSIPNode {
  return {
    id,
    title: `Node ${id}`,
    rule: `Rule ${id}`,
    sortOrder,
    createdAt: CREATED_AT,
  };
}

function makeLibraryEntry(
  id: string,
  overrides: Partial<RSIPLibraryEntry> = {},
): RSIPLibraryEntry {
  return {
    id,
    title: `Entry ${id}`,
    rule: `Rule ${id}`,
    cumulativeExecutionDays: 5,
    internalizationProgress: 8.33,
    lastActiveAt: new Date('2026-07-16T01:00:00.000Z'),
    timesUsed: 1,
    ...overrides,
  };
}

function failFirstWriteTo(key: string) {
  const nativeSetItem = Storage.prototype.setItem;
  let failed = false;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    writeKey,
    value,
  ) {
    if (!failed && writeKey === key) {
      failed = true;
      throw new Error(`Injected write failure for ${key}`);
    }
    nativeSetItem.call(this, writeKey, value);
  });
}

function failPersistentlyWhen(
  predicate: (key: string, value: string) => boolean,
) {
  const nativeSetItem = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (predicate(key, value)) {
      throw new DOMException(QUOTA_ERROR_MESSAGE, QUOTA_ERROR_NAME);
    }
    nativeSetItem.call(this, key, value);
  });
}

describe('storage/rsipAtomicIntents', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts supplied nodes and metadata without overwriting an existing id', () => {
    saveRSIPNodes([makeNode('existing', 0)]);

    createRSIPNodesWithMeta(
      [makeNode('new', 2), { ...makeNode('existing', 1), title: 'Updated' }],
      {
        lastAddedAt: new Date('2026-07-16T02:00:00.000Z'),
        allowMultiplePerDay: false,
      },
    );

    expect(getRSIPNodes()).toEqual([
      expect.objectContaining({ id: 'existing', title: 'Node existing' }),
      expect.objectContaining({ id: 'new' }),
    ]);
    expect(getRSIPMeta()).toEqual(
      expect.objectContaining({
        lastAddedAt: new Date('2026-07-16T02:00:00.000Z'),
        allowMultiplePerDay: false,
      }),
    );
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
  });

  it('does not regress a node or metadata changed after an ambiguous creation response', () => {
    saveRSIPNodes([
      {
        ...makeNode('same-id'),
        title: 'Edited after commit',
        totalExecutions: 9,
      },
    ]);
    saveRSIPMeta({
      lastAddedAt: new Date('2026-07-16T05:00:00.000Z'),
      allowMultiplePerDay: true,
      lastTreeOpenedAt: new Date('2026-07-16T06:00:00.000Z'),
      treeOpenStreak: 8,
      currentRunNumber: 3,
      currentRunStartedAt: new Date('2026-07-16T00:30:00.000Z'),
    });

    createRSIPNodesWithMeta(
      [
        {
          ...makeNode('same-id'),
          title: 'Stale creation payload',
          totalExecutions: 0,
        },
      ],
      {
        lastAddedAt: new Date('2026-07-16T02:00:00.000Z'),
        allowMultiplePerDay: false,
        treeOpenStreak: 1,
        currentRunNumber: 1,
        currentRunStartedAt: new Date('2026-07-16T02:00:00.000Z'),
      },
    );

    expect(getRSIPNodes()).toEqual([
      expect.objectContaining({
        id: 'same-id',
        title: 'Edited after commit',
        totalExecutions: 9,
      }),
    ]);
    expect(getRSIPMeta()).toEqual(
      expect.objectContaining({
        lastAddedAt: new Date('2026-07-16T05:00:00.000Z'),
        allowMultiplePerDay: true,
        lastTreeOpenedAt: new Date('2026-07-16T06:00:00.000Z'),
        treeOpenStreak: 8,
        currentRunNumber: 3,
        currentRunStartedAt: new Date('2026-07-16T00:30:00.000Z'),
      }),
    );
  });

  it('rolls node and metadata writes forward after an interrupted creation', () => {
    saveRSIPNodes([makeNode('existing')]);
    saveRSIPMeta({ allowMultiplePerDay: true });
    const setItem = failFirstWriteTo(STORAGE_KEYS.RSIP_META);

    expect(() =>
      createRSIPNodesWithMeta([makeNode('new', 1)], {
        lastAddedAt: new Date('2026-07-16T03:00:00.000Z'),
        allowMultiplePerDay: false,
      }),
    ).toThrow('Injected write failure');

    expect(
      localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL),
    ).not.toBeNull();
    expect(
      localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL),
    ).not.toContain('Node existing');
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_NODES)).toContain('new');
    setItem.mockRestore();

    // Any subsequent RSIP read replays the entire journal before exposing data.
    expect(getRSIPMeta()).toEqual(
      expect.objectContaining({
        lastAddedAt: new Date('2026-07-16T03:00:00.000Z'),
        allowMultiplePerDay: true,
      }),
    );
    expect(getRSIPNodes().map((node) => node.id)).toEqual(['existing', 'new']);
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
  });

  it('rolls back a creation when its target write persistently exceeds quota', () => {
    saveRSIPNodes([makeNode('existing')]);
    saveRSIPMeta({ allowMultiplePerDay: true });
    const setItem = failPersistentlyWhen(
      (key, value) =>
        key === STORAGE_KEYS.RSIP_META &&
        value.includes('2026-07-16T07:00:00.000Z'),
    );

    expect(() =>
      createRSIPNodesWithMeta([makeNode('too-large', 1)], {
        lastAddedAt: new Date('2026-07-16T07:00:00.000Z'),
        allowMultiplePerDay: false,
      }),
    ).toThrow('Storage quota exhausted');

    setItem.mockRestore();
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
    expect(getRSIPNodes().map((node) => node.id)).toEqual(['existing']);
    expect(getRSIPMeta()).toEqual(
      expect.objectContaining({ allowMultiplePerDay: true }),
    );
    expect(getRSIPNodes().map((node) => node.id)).toEqual(['existing']);
  });

  it('clears the journal and preserves a concurrent node edit during quota rollback', () => {
    saveRSIPNodes([makeNode('existing')]);
    saveRSIPMeta({ allowMultiplePerDay: true });
    const nativeSetItem = Storage.prototype.setItem;
    let conflictInjected = false;
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (
          !conflictInjected &&
          key === STORAGE_KEYS.RSIP_META &&
          value.includes('2026-07-16T08:00:00.000Z')
        ) {
          conflictInjected = true;
          const nodes = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.RSIP_NODES) ?? '[]',
          ) as Array<Record<string, unknown>>;
          nativeSetItem.call(
            this,
            STORAGE_KEYS.RSIP_NODES,
            JSON.stringify(
              nodes.map((node) =>
                node.id === 'new'
                  ? { ...node, title: 'Concurrent node edit' }
                  : node,
              ),
            ),
          );
          throw new DOMException(QUOTA_ERROR_MESSAGE, QUOTA_ERROR_NAME);
        }
        nativeSetItem.call(this, key, value);
      });

    expect(() =>
      createRSIPNodesWithMeta([makeNode('new', 1)], {
        lastAddedAt: new Date('2026-07-16T08:00:00.000Z'),
      }),
    ).toThrow(QUOTA_ERROR_MESSAGE);
    setItem.mockRestore();

    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
    expect(getRSIPNodes()).toEqual([
      expect.objectContaining({ id: 'existing' }),
      expect.objectContaining({ id: 'new', title: 'Concurrent node edit' }),
    ]);
    expect(getRSIPMeta()).toEqual(
      expect.objectContaining({ allowMultiplePerDay: true }),
    );
  });

  it('rolls creation forward without regressing concurrent node or metadata edits', () => {
    saveRSIPNodes([makeNode('existing')]);
    saveRSIPMeta({
      allowMultiplePerDay: true,
      treeOpenStreak: 2,
      lastAddedAt: new Date('2026-07-16T02:00:00.000Z'),
    });
    const failure = failFirstWriteTo(STORAGE_KEYS.RSIP_META);

    expect(() =>
      createRSIPNodesWithMeta([makeNode('new', 1)], {
        allowMultiplePerDay: false,
        treeOpenStreak: 3,
        lastAddedAt: new Date('2026-07-16T08:00:00.000Z'),
      }),
    ).toThrow('Injected write failure');
    failure.mockRestore();

    const rawNodes = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.RSIP_NODES) ?? '[]',
    ) as Array<Record<string, unknown>>;
    localStorage.setItem(
      STORAGE_KEYS.RSIP_NODES,
      JSON.stringify(
        rawNodes.map((node) =>
          node.id === 'new'
            ? { ...node, title: 'Edited while recovery was pending' }
            : node,
        ),
      ),
    );
    localStorage.setItem(
      STORAGE_KEYS.RSIP_META,
      JSON.stringify({
        allowMultiplePerDay: true,
        treeOpenStreak: 9,
        lastAddedAt: '2026-07-16T09:00:00.000Z',
        lastTreeOpenedAt: '2026-07-16T10:00:00.000Z',
      }),
    );

    expect(getRSIPNodes()).toEqual([
      expect.objectContaining({ id: 'existing' }),
      expect.objectContaining({
        id: 'new',
        title: 'Edited while recovery was pending',
      }),
    ]);
    expect(getRSIPMeta()).toEqual(
      expect.objectContaining({
        allowMultiplePerDay: true,
        treeOpenStreak: 9,
        lastAddedAt: new Date('2026-07-16T09:00:00.000Z'),
        lastTreeOpenedAt: new Date('2026-07-16T10:00:00.000Z'),
      }),
    );
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
  });

  it('rolls library and node removal forward after an interrupted archive', () => {
    saveRSIPNodes([makeNode('target'), makeNode('survivor', 1)]);
    saveRSIPPolicyLibrary([
      makeLibraryEntry('target', {
        cumulativeExecutionDays: 10,
        internalizationProgress: 16.67,
        timesUsed: 7,
      }),
    ]);
    const setItem = failFirstWriteTo(STORAGE_KEYS.RSIP_NODES);

    expect(() =>
      archiveRSIPNodesAndRemove(
        ['target'],
        [
          makeLibraryEntry('target', {
            cumulativeExecutionDays: 15,
            internalizationProgress: 25,
            timesUsed: 99,
          }),
        ],
      ),
    ).toThrow('Injected write failure');

    expect(
      localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL),
    ).not.toBeNull();
    expect(
      localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL),
    ).not.toContain('survivor');
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_POLICY_LIBRARY)).toContain(
      '"cumulativeExecutionDays":15',
    );
    setItem.mockRestore();

    const [archived] = getRSIPPolicyLibrary();
    expect(archived).toMatchObject({
      id: 'target',
      cumulativeExecutionDays: 15,
      internalizationProgress: 25,
      timesUsed: 7,
    });
    expect(getRSIPNodes().map((node) => node.id)).toEqual(['survivor']);
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
  });

  it('falls back to the pre-intent snapshot when replay keeps exceeding quota', () => {
    saveRSIPNodes([makeNode('target'), makeNode('survivor', 1)]);
    saveRSIPPolicyLibrary([
      makeLibraryEntry('target', {
        cumulativeExecutionDays: 10,
        internalizationProgress: 16.67,
        timesUsed: 7,
      }),
    ]);
    const firstFailure = failFirstWriteTo(STORAGE_KEYS.RSIP_NODES);

    expect(() =>
      archiveRSIPNodesAndRemove(
        ['target'],
        [
          makeLibraryEntry('target', {
            cumulativeExecutionDays: 15,
            internalizationProgress: 25,
            timesUsed: 99,
          }),
        ],
      ),
    ).toThrow('Injected write failure');
    firstFailure.mockRestore();

    const quotaFailure = failPersistentlyWhen(
      (key, value) =>
        key === STORAGE_KEYS.RSIP_NODES && !value.includes('"id":"target"'),
    );

    // Recovery first retries the commit. When the same target remains
    // unwritable, it restores both pre-intent snapshots before returning data.
    expect(getRSIPPolicyLibrary()).toEqual([
      expect.objectContaining({
        id: 'target',
        cumulativeExecutionDays: 10,
        internalizationProgress: 16.67,
        timesUsed: 7,
      }),
    ]);
    quotaFailure.mockRestore();

    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
    expect(getRSIPNodes().map((node) => node.id)).toEqual([
      'target',
      'survivor',
    ]);
    expect(getRSIPPolicyLibrary()[0]).toMatchObject({
      cumulativeExecutionDays: 10,
      timesUsed: 7,
    });
  });

  it('clears the journal and preserves a concurrent archive edit during quota rollback', () => {
    saveRSIPNodes([makeNode('target'), makeNode('survivor', 1)]);
    saveRSIPPolicyLibrary([makeLibraryEntry('target')]);
    const nativeSetItem = Storage.prototype.setItem;
    let conflictInjected = false;
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (
          !conflictInjected &&
          key === STORAGE_KEYS.RSIP_NODES &&
          !value.includes('"id":"target"')
        ) {
          conflictInjected = true;
          const library = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.RSIP_POLICY_LIBRARY) ?? '[]',
          ) as Array<Record<string, unknown>>;
          nativeSetItem.call(
            this,
            STORAGE_KEYS.RSIP_POLICY_LIBRARY,
            JSON.stringify(
              library.map((entry) =>
                entry.id === 'target'
                  ? { ...entry, title: 'Concurrent archive edit' }
                  : entry,
              ),
            ),
          );
          throw new DOMException(QUOTA_ERROR_MESSAGE, QUOTA_ERROR_NAME);
        }
        nativeSetItem.call(this, key, value);
      });

    expect(() =>
      archiveRSIPNodesAndRemove(
        ['target'],
        [makeLibraryEntry('target', { cumulativeExecutionDays: 9 })],
      ),
    ).toThrow(QUOTA_ERROR_MESSAGE);
    setItem.mockRestore();

    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
    expect(getRSIPPolicyLibrary()).toEqual([
      expect.objectContaining({
        id: 'target',
        title: 'Concurrent archive edit',
        cumulativeExecutionDays: 5,
      }),
    ]);
    expect(getRSIPNodes().map((node) => node.id)).toEqual([
      'target',
      'survivor',
    ]);
  });

  it('rolls archive forward while preserving concurrent fields and monotonic counters', () => {
    saveRSIPNodes([makeNode('target'), makeNode('survivor', 1)]);
    saveRSIPPolicyLibrary([
      makeLibraryEntry('target', {
        title: 'Before archive',
        cumulativeExecutionDays: 10,
        internalizationProgress: 16.67,
        lastActiveAt: new Date('2026-07-16T01:00:00.000Z'),
        timesUsed: 3,
      }),
    ]);
    const failure = failFirstWriteTo(STORAGE_KEYS.RSIP_NODES);

    expect(() =>
      archiveRSIPNodesAndRemove(
        ['target'],
        [
          makeLibraryEntry('target', {
            title: 'Archive payload',
            cumulativeExecutionDays: 20,
            internalizationProgress: 33.33,
            lastActiveAt: new Date('2026-07-16T04:00:00.000Z'),
            timesUsed: 4,
          }),
        ],
      ),
    ).toThrow('Injected write failure');
    failure.mockRestore();

    const [partiallyApplied] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.RSIP_POLICY_LIBRARY) ?? '[]',
    ) as Array<Record<string, unknown>>;
    localStorage.setItem(
      STORAGE_KEYS.RSIP_POLICY_LIBRARY,
      JSON.stringify([
        {
          ...partiallyApplied,
          title: 'Concurrent library edit',
          emoji: '🧭',
          cumulativeExecutionDays: 25,
          internalizationProgress: 41.67,
          lastActiveAt: '2026-07-16T05:00:00.000Z',
          timesUsed: 8,
        },
      ]),
    );

    expect(getRSIPPolicyLibrary()).toEqual([
      expect.objectContaining({
        id: 'target',
        title: 'Concurrent library edit',
        emoji: '🧭',
        cumulativeExecutionDays: 25,
        internalizationProgress: 41.67,
        lastActiveAt: new Date('2026-07-16T05:00:00.000Z'),
        timesUsed: 8,
      }),
    ]);
    expect(getRSIPNodes().map((node) => node.id)).toEqual(['survivor']);
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
  });

  it('does not mutate RSIP state when even the compact journal cannot be stored', () => {
    saveRSIPNodes([makeNode('existing')]);
    saveRSIPMeta({ allowMultiplePerDay: true });
    const setItem = failPersistentlyWhen(
      (key) => key === STORAGE_KEYS.RSIP_ATOMIC_JOURNAL,
    );

    expect(() =>
      createRSIPNodesWithMeta([makeNode('new', 1)], {
        allowMultiplePerDay: false,
      }),
    ).toThrow('Storage quota exhausted');

    setItem.mockRestore();
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
    expect(getRSIPNodes().map((node) => node.id)).toEqual(['existing']);
    expect(getRSIPMeta()).toEqual(
      expect.objectContaining({ allowMultiplePerDay: true }),
    );
  });

  it('makes a retry after removal a no-op and never regresses archive totals', () => {
    saveRSIPNodes([makeNode('target')]);
    saveRSIPPolicyLibrary([
      makeLibraryEntry('target', {
        cumulativeExecutionDays: 12,
        internalizationProgress: 20,
        timesUsed: 4,
      }),
    ]);
    const nextEntry = makeLibraryEntry('target', {
      cumulativeExecutionDays: 18,
      internalizationProgress: 30,
      timesUsed: 5,
    });

    archiveRSIPNodesAndRemove(['target'], [nextEntry]);
    archiveRSIPNodesAndRemove(
      ['target'],
      [
        {
          ...nextEntry,
          cumulativeExecutionDays: 1,
          internalizationProgress: 1.67,
          timesUsed: 999,
        },
      ],
    );

    expect(getRSIPPolicyLibrary()).toEqual([
      expect.objectContaining({
        cumulativeExecutionDays: 18,
        internalizationProgress: 30,
        timesUsed: 4,
      }),
    ]);
  });

  it('rejects an incomplete archive before writing a journal', () => {
    saveRSIPNodes([makeNode('target')]);

    expect(() => archiveRSIPNodesAndRemove(['target'], [])).toThrow(
      'Missing RSIP library entry',
    );
    expect(getRSIPNodes()).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
  });

  it('fails safely when a persisted concurrent descendant lacks an archive entry', () => {
    const root = makeNode('root');
    const child = { ...makeNode('child', 1), parentId: 'root' };
    const grandchild = { ...makeNode('grandchild', 2), parentId: 'child' };
    saveRSIPNodes([root, child, grandchild, makeNode('survivor', 3)]);
    saveRSIPPolicyLibrary([makeLibraryEntry('unrelated')]);
    const nodesBefore = localStorage.getItem(STORAGE_KEYS.RSIP_NODES);
    const libraryBefore = localStorage.getItem(
      STORAGE_KEYS.RSIP_POLICY_LIBRARY,
    );

    expect(() =>
      archiveRSIPNodesAndRemove(['root'], [makeLibraryEntry('root')]),
    ).toThrow('Missing RSIP library entry for archived node: child');

    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_NODES)).toBe(nodesBefore);
    expect(localStorage.getItem(STORAGE_KEYS.RSIP_POLICY_LIBRARY)).toBe(
      libraryBefore,
    );
  });

  it('archives the complete persisted descendant closure from a requested root', () => {
    const root = makeNode('root');
    const child = { ...makeNode('child', 1), parentId: 'root' };
    const grandchild = { ...makeNode('grandchild', 2), parentId: 'child' };
    saveRSIPNodes([root, child, grandchild, makeNode('survivor', 3)]);

    archiveRSIPNodesAndRemove(
      ['root'],
      [
        makeLibraryEntry('root'),
        makeLibraryEntry('child'),
        makeLibraryEntry('grandchild'),
      ],
    );

    expect(getRSIPNodes().map((node) => node.id)).toEqual(['survivor']);
    expect(getRSIPPolicyLibrary().map((entry) => entry.id)).toEqual([
      'root',
      'child',
      'grandchild',
    ]);
  });

  it('aborts before applying when a hidden child appears after journaling and allows retry', () => {
    const root = makeNode('root');
    saveRSIPNodes([root, makeNode('survivor', 2)]);
    saveRSIPPolicyLibrary([makeLibraryEntry('unrelated')]);
    const nativeSetItem = Storage.prototype.setItem;
    let childInjected = false;
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        nativeSetItem.call(this, key, value);
        if (!childInjected && key === STORAGE_KEYS.RSIP_ATOMIC_JOURNAL) {
          childInjected = true;
          const nodes = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.RSIP_NODES) ?? '[]',
          ) as Array<Record<string, unknown>>;
          nativeSetItem.call(
            this,
            STORAGE_KEYS.RSIP_NODES,
            JSON.stringify([
              ...nodes,
              { ...makeNode('hidden-child', 1), parentId: 'root' },
            ]),
          );
        }
      });

    expect(() =>
      archiveRSIPNodesAndRemove(['root'], [makeLibraryEntry('root')]),
    ).toThrow('unjournaled descendants: hidden-child');
    setItem.mockRestore();

    expect(localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL)).toBeNull();
    expect(
      getRSIPNodes()
        .map((node) => node.id)
        .sort(),
    ).toEqual(['hidden-child', 'root', 'survivor']);
    expect(getRSIPPolicyLibrary().map((entry) => entry.id)).toEqual([
      'unrelated',
    ]);

    archiveRSIPNodesAndRemove(
      ['root'],
      [makeLibraryEntry('root'), makeLibraryEntry('hidden-child')],
    );
    expect(getRSIPNodes().map((node) => node.id)).toEqual(['survivor']);
    expect(getRSIPPolicyLibrary().map((entry) => entry.id)).toEqual([
      'unrelated',
      'root',
      'hidden-child',
    ]);
  });
});
