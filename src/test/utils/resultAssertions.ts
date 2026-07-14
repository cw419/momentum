import { expect } from 'vitest';
import type { Result } from '../../domain/result';

export function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected Result.ok, received ${String(result.error)}`);
  }
  return result.value;
}

export function expectErr<T, E>(result: Result<T, E>): E {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected Result.err, received Result.ok');
  }
  return result.error;
}
