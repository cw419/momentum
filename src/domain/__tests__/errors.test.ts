import { describe, expect, it } from 'vitest';
import { toAppError } from '../errors';

describe('domain/errors', () => {
  it('maps Error instances with message and cause', () => {
    const source = new Error('boom');
    const appError = toAppError(source, 'fallback');

    expect(appError).toEqual({
      code: 'UNKNOWN',
      message: 'boom',
      cause: source,
    });
  });

  it('uses fallback for Error with empty message', () => {
    const source = new Error('');
    const appError = toAppError(source, 'fallback-message');
    expect(appError.message).toBe('fallback-message');
  });

  it('maps string errors and falls back for empty string', () => {
    expect(toAppError('bad-input', 'fallback').message).toBe('bad-input');
    expect(toAppError('', 'fallback').message).toBe('fallback');
  });

  it('handles unknown error values with fallback message', () => {
    const unknown = { reason: 'unexpected' };
    const appError = toAppError(unknown, 'fallback');
    expect(appError).toEqual({
      code: 'UNKNOWN',
      message: 'fallback',
      cause: unknown,
    });
  });
});
