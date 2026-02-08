import { describe, expect, it } from 'vitest';
import { normalizeUnknownError } from '../normalizeError';

describe('normalizeUnknownError', () => {
  it('returns the same Error instance when input is Error', () => {
    const source = new Error('boom');
    const result = normalizeUnknownError(source);

    expect(result).toBe(source);
  });

  it('normalizes string/object/number into Error', () => {
    expect(normalizeUnknownError('plain message').message).toBe(
      'plain message',
    );
    expect(normalizeUnknownError({ message: 'from object' }).message).toBe(
      'from object',
    );
    expect(normalizeUnknownError(404).message).toBe('404');
  });

  it('uses fallback for empty message payload', () => {
    expect(normalizeUnknownError('', 'fallback').message).toBe('fallback');
  });
});
