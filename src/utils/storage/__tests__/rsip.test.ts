import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../keys';
import { getRSIPMeta, getRSIPNodes, saveRSIPMeta, saveRSIPNodes } from '../rsip';

describe('storage/rsip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty RSIP nodes when storage is empty', () => {
    expect(getRSIPNodes()).toEqual([]);
  });

  it('hydrates RSIP node createdAt as Date', () => {
    localStorage.setItem(
      STORAGE_KEYS.RSIP_NODES,
      JSON.stringify([
        {
          id: 'node-1',
          title: 'Rule',
          rule: 'Do it',
          sortOrder: 0,
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ])
    );

    const [node] = getRSIPNodes();
    expect(node.id).toBe('node-1');
    expect(node.createdAt).toBeInstanceOf(Date);
  });

  it('saves RSIP nodes JSON', () => {
    saveRSIPNodes([
      {
        id: 'node-2',
        title: 'Saved',
        rule: 'Persist',
        sortOrder: 1,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ]);

    expect(localStorage.getItem(STORAGE_KEYS.RSIP_NODES)).toContain('node-2');
  });

  it('returns default empty meta when storage is missing', () => {
    expect(getRSIPMeta()).toEqual({});
  });

  it('hydrates meta lastAddedAt and strict/free mode flag', () => {
    localStorage.setItem(
      STORAGE_KEYS.RSIP_META,
      JSON.stringify({
        lastAddedAt: '2026-02-02T00:00:00.000Z',
        allowMultiplePerDay: true,
      })
    );

    const meta = getRSIPMeta();
    expect(meta.lastAddedAt).toBeInstanceOf(Date);
    expect(meta.allowMultiplePerDay).toBe(true);
  });

  it('serializes meta dates with safe boolean fallback', () => {
    saveRSIPMeta({
      lastAddedAt: new Date('2026-02-03T00:00:00.000Z'),
      allowMultiplePerDay: undefined,
    });

    const raw = localStorage.getItem(STORAGE_KEYS.RSIP_META);
    expect(raw).toContain('2026-02-03T00:00:00.000Z');
    expect(raw).toContain('"allowMultiplePerDay":false');
  });
});
