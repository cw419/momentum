import { describe, expect, test } from 'vitest';
import { parseExceptionRulesToImport } from '../exceptionRules';

describe('import/exceptionRules parser', () => {
  test('extracts valid rules and skips malformed entries', () => {
    const result = parseExceptionRulesToImport({
      rules: [
        { name: 'Rule A', type: 'pause_only', description: 'desc' },
        { name: 'Rule B', type: 'bad-type' },
        'nope',
      ],
    });

    expect(result).toEqual([
      { name: 'Rule A', type: 'pause_only', description: 'desc' },
    ]);
  });
});
