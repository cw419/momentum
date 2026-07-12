import { describe, expect, it, vi } from 'vitest';
import {
  createLocalStorageMock,
  createUnitChain,
} from '../../../test/factories';
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
});
