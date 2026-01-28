import { describe, expect, it, vi } from 'vitest';
import { fireAndForget } from '../fireAndForget';

describe('fireAndForget', () => {
  it('invokes onError for rejected promises', async () => {
    const onError = vi.fn();
    fireAndForget(Promise.reject(new Error('boom')), { onError, label: 'test' });
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

