import { describe, expect, it } from 'vitest';
import { err, ok } from '../result';

describe('domain/result', () => {
  it('builds ok result with value payload', () => {
    const result = ok({ id: 'value-1' });
    expect(result).toEqual({ ok: true, value: { id: 'value-1' } });
  });

  it('builds err result with error payload', () => {
    const result = err({ code: 'E_FAIL', message: 'failed' });
    expect(result).toEqual({ ok: false, error: { code: 'E_FAIL', message: 'failed' } });
  });
});
