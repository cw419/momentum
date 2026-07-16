import { describe, expect, it, vi } from 'vitest';
import {
  createLocalStorageMock,
  createUnitChain,
} from '../../../test/factories';
import type { RSIPNode } from '../../../types';
import { loadAppDataSnapshot } from '../appDataSnapshot';

vi.mock('../../../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('loadAppDataSnapshot', () => {
  it('loads independent datasets in parallel and falls back per failed source', async () => {
    const storage = createLocalStorageMock();
    const chain = createUnitChain({ id: 'chain-1' });
    vi.mocked(storage.getActiveChains).mockResolvedValue([chain]);
    vi.mocked(storage.getRSIPNodes).mockRejectedValue(new Error('unavailable'));

    const snapshot = await loadAppDataSnapshot(storage);

    expect(snapshot.chains).toEqual([chain]);
    expect(snapshot.rsipNodes).toEqual([]);
    expect(storage.getTaskTimeStats).toHaveBeenCalledTimes(1);
  });

  it('repairs drifted addition metadata from a committed node exactly once', async () => {
    const createdAt = new Date('2026-07-16T08:00:00.000Z');
    const node: RSIPNode = {
      id: 'committed-node',
      title: 'Committed policy',
      rule: 'Persist before metadata',
      sortOrder: 1,
      createdAt,
    };
    const storage = createLocalStorageMock();
    vi.mocked(storage.getRSIPNodes).mockResolvedValue([node]);
    vi.mocked(storage.getRSIPMeta).mockResolvedValue({
      allowMultiplePerDay: false,
      treeOpenStreak: 4,
    });

    const snapshot = await loadAppDataSnapshot(storage);

    expect(snapshot.rsipMeta).toEqual({
      allowMultiplePerDay: false,
      treeOpenStreak: 4,
      lastAddedAt: createdAt,
    });
    expect(storage.saveRSIPMeta).toHaveBeenCalledOnce();
    expect(storage.saveRSIPMeta).toHaveBeenCalledWith(snapshot.rsipMeta);
  });

  it('keeps the repaired snapshot when reconciliation persistence fails', async () => {
    const createdAt = new Date('2026-07-16T08:00:00.000Z');
    const node: RSIPNode = {
      id: 'committed-node',
      title: 'Committed policy',
      rule: 'Persist before metadata',
      sortOrder: 1,
      createdAt,
    };
    const storage = createLocalStorageMock();
    vi.mocked(storage.getRSIPNodes).mockResolvedValue([node]);
    vi.mocked(storage.getRSIPMeta).mockResolvedValue({
      allowMultiplePerDay: false,
    });
    vi.mocked(storage.saveRSIPMeta).mockRejectedValue(
      new Error('meta remains unavailable'),
    );

    const snapshot = await loadAppDataSnapshot(storage);

    expect(snapshot.rsipMeta.lastAddedAt).toEqual(createdAt);
    expect(storage.saveRSIPMeta).toHaveBeenCalledOnce();
  });

  it('does not overwrite storage when metadata could not be loaded safely', async () => {
    const createdAt = new Date('2026-07-16T08:00:00.000Z');
    const storage = createLocalStorageMock();
    vi.mocked(storage.getRSIPNodes).mockResolvedValue([
      {
        id: 'committed-node',
        title: 'Committed policy',
        rule: 'Persist before metadata',
        sortOrder: 1,
        createdAt,
      },
    ]);
    vi.mocked(storage.getRSIPMeta).mockRejectedValue(
      new Error('meta load failed'),
    );

    const snapshot = await loadAppDataSnapshot(storage);

    expect(snapshot.rsipMeta.lastAddedAt).toEqual(createdAt);
    expect(storage.saveRSIPMeta).not.toHaveBeenCalled();
  });
});
