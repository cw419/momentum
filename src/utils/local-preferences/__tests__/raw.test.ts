import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllKeys, getRaw, remove, setRaw } from '../raw';

describe('local-preferences/raw', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gets/sets/removes raw values', () => {
    expect(getRaw('raw:key')).toBeNull();

    setRaw('raw:key', 'value-1');
    expect(getRaw('raw:key')).toBe('value-1');

    remove('raw:key');
    expect(getRaw('raw:key')).toBeNull();
  });

  it('collects all keys via localStorage key(index)', () => {
    localStorage.setItem('k1', 'value-1');
    localStorage.setItem('k2', 'value-2');

    expect(getAllKeys()).toEqual(['k1', 'k2']);
  });

  it('returns safe fallbacks when localStorage throws', () => {
    localStorage.setItem('existing', 'value');
    const storagePrototype = Object.getPrototypeOf(localStorage) as Storage;
    const getItemSpy = vi
      .spyOn(storagePrototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    const setItemSpy = vi
      .spyOn(storagePrototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    const removeItemSpy = vi
      .spyOn(storagePrototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    vi.spyOn(storagePrototype, 'key').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getRaw('x')).toBeNull();
    expect(() => setRaw('x', 'y')).not.toThrow();
    expect(() => remove('x')).not.toThrow();
    expect(getAllKeys()).toEqual([]);
    expect(getItemSpy).toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalled();
    expect(removeItemSpy).toHaveBeenCalled();
  });
});
