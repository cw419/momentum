import { describe, expect, it } from 'vitest';
import { decodeCompletionHistory } from '../history';

describe('serialization/history', () => {
  it('decodes completion history and applies timing defaults', () => {
    const history = decodeCompletionHistory({
      chainId: 'chain-1',
      completedAt: '2026-02-01T00:00:00.000Z',
      duration: 25,
      wasSuccessful: true,
    });

    expect(history.completedAt).toBeInstanceOf(Date);
    expect(history.actualDuration).toBe(25);
    expect(history.isForwardTimed).toBe(false);
  });
});
