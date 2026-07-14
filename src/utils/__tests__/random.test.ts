import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('randomId', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when the browser provides it', async () => {
    const randomUUID = vi.fn().mockReturnValue('uuid-value');
    const getRandomValues = vi.fn();
    vi.stubGlobal('crypto', { randomUUID, getRandomValues });
    const { randomId } = await import('../random');

    expect(randomId('session')).toBe('session_uuid-value');
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it('uses cryptographic bytes when randomUUID is unavailable', async () => {
    const getRandomValues = vi.fn((buffer: Uint8Array) => {
      buffer.set([
        0, 1, 15, 16, 31, 32, 63, 64, 127, 128, 191, 192, 223, 224, 254, 255,
      ]);
      return buffer;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { randomId } = await import('../random');

    expect(randomId('chain')).toBe(
      'chain_1700000000000_00010f101f203f407f80bfc0dfe0feff',
    );
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it('falls back to a timestamp plus a monotonic counter without crypto', async () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Date, 'now').mockReturnValue(4_660);
    const { randomId } = await import('../random');

    expect(randomId('task')).toBe('task_4660_12341');
    expect(randomId('task')).toBe('task_4660_12342');
  });
});
