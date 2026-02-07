import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllKeys, getRaw, remove, setRaw } from '../raw';

describe('local-preferences/raw', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gets/sets/removes raw values', () => {
    expect(getRaw('raw:key')).toBeNull();

    setRaw('raw:key', 'value-1');
    expect(getRaw('raw:key')).toBe('value-1');

    remove('raw:key');
    expect(getRaw('raw:key')).toBeNull();
  });

  it('collects all keys via localStorage key(index)', () => {
    const storage = window.localStorage as unknown as {
      key: (index: number) => string | null;
      length: number;
    };

    storage.key = vi.fn((index: number) => (['k1', 'k2'][index] ?? null));
    Object.defineProperty(storage, 'length', { configurable: true, value: 2 });

    expect(getAllKeys()).toEqual(['k1', 'k2']);
  });

  it('returns safe fallbacks when localStorage throws', () => {
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const removeItemSpy = vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const storage = window.localStorage as unknown as {
      key: (index: number) => string | null;
      length: number;
    };
    storage.key = () => {
      throw new Error('blocked');
    };
    Object.defineProperty(storage, 'length', { configurable: true, value: 1 });

    expect(getRaw('x')).toBeNull();
    expect(() => setRaw('x', 'y')).not.toThrow();
    expect(() => remove('x')).not.toThrow();
    expect(getAllKeys()).toEqual([]);

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });
});
