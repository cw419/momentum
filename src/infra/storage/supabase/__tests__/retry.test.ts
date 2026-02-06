import { beforeEach, describe, expect, it, vi } from 'vitest';

function createError(message: string, code?: string): Error & { code?: string } {
  const err = new Error(message) as Error & { code?: string };
  if (code) err.code = code;
  return err;
}

describe('supabase/retry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retries with exponential backoff and eventually succeeds', async () => {
    vi.useFakeTimers();
    const { retryOperation } = await import('../retry');

    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary #1'))
      .mockRejectedValueOnce(new Error('temporary #2'))
      .mockResolvedValue('ok');

    const promise = retryOperation(operation, 3, 100);

    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(operation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(199);
    expect(operation).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry for non-retryable error code', async () => {
    vi.useFakeTimers();
    const { retryOperation } = await import('../retry');

    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(createError('missing column', 'PGRST204'));

    await expect(retryOperation(operation, 3, 100)).rejects.toThrow('missing column');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('does not retry for non-retryable serialization errors', async () => {
    vi.useFakeTimers();
    const { retryOperation } = await import('../retry');

    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('Converting circular structure to JSON'));

    await expect(retryOperation(operation, 3, 100)).rejects.toThrow('Converting circular structure to JSON');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('fails when auth cannot be re-established for retryWithAuth', async () => {
    vi.useFakeTimers();
    const { retryWithAuth } = await import('../retry');

    const deps = {
      isUserAuthenticated: vi.fn().mockResolvedValue(false),
      waitForAuthentication: vi.fn().mockResolvedValue({ user: null, isAuthenticated: false }),
    };
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('violates row-level security policy'));

    const rejection = expect(retryWithAuth(deps, operation, 1, 100)).rejects.toThrow(
      'Authentication failed after waiting'
    );
    await vi.runAllTimersAsync();

    await rejection;
    expect(operation).toHaveBeenCalledTimes(1);
    expect(deps.waitForAuthentication).toHaveBeenCalledTimes(1);
  });

  it('does not retry retryWithAuth for non-auth non-retryable code', async () => {
    vi.useFakeTimers();
    const { retryWithAuth } = await import('../retry');

    const deps = {
      isUserAuthenticated: vi.fn().mockResolvedValue(true),
      waitForAuthentication: vi.fn().mockResolvedValue({ user: { id: 'u-1' }, isAuthenticated: true }),
    };
    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(createError('column missing', '42703'));

    await expect(retryWithAuth(deps, operation, 3, 100)).rejects.toThrow('column missing');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(deps.waitForAuthentication).not.toHaveBeenCalled();
  });

  it('retries auth-related failures and succeeds after authentication wait', async () => {
    vi.useFakeTimers();
    const { retryWithAuth } = await import('../retry');

    const deps = {
      isUserAuthenticated: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
      waitForAuthentication: vi.fn().mockResolvedValue({
        user: { id: 'user-1' },
        isAuthenticated: true,
      }),
    };
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('RLS violation during write'))
      .mockResolvedValue('ok');

    const promise = retryWithAuth(deps, operation, 2, 100);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(deps.waitForAuthentication).toHaveBeenCalledTimes(1);
  });
});
