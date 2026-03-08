import { describe, expect, test } from 'vitest';
import { parseImportHistory } from '../history';

describe('import/history parser', () => {
  test('maps completion history and skips missing chain mappings', () => {
    const result = parseImportHistory(
      [
        {
          chainId: 'source-chain',
          completedAt: '2026-02-01T00:00:00.000Z',
          duration: 25,
          wasSuccessful: true,
          actualDuration: 25,
        },
        {
          chainId: 'missing-chain',
          completedAt: '2026-02-02T00:00:00.000Z',
          duration: 10,
          wasSuccessful: false,
        },
      ],
      true,
      new Map([['source-chain', 'mapped-chain']]),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      chainId: 'mapped-chain',
      duration: 25,
      actualDuration: 25,
    });
    expect(result[0]?.completedAt).toBeInstanceOf(Date);
  });
});
