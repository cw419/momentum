import { beforeEach, describe, expect, it } from 'vitest';
import { localPreferences } from '../../../utils/localPreferences';
import { LOCAL_STORAGE_KEYS } from '../keys';

describe('local-preferences/storageMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads and writes storage mode', () => {
    expect(localPreferences.getStorageMode()).toBeNull();

    localPreferences.setStorageMode('local');
    expect(localPreferences.getStorageMode()).toBe('local');

    localPreferences.setStorageMode('supabase');
    expect(localPreferences.getStorageMode()).toBe('supabase');
  });

  it('returns null for invalid persisted value', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.STORAGE_MODE, 'invalid');
    expect(localPreferences.getStorageMode()).toBeNull();
  });

  it('reads and writes first-launch hint dismissed flag', () => {
    expect(localPreferences.getStorageModeHintDismissed()).toBe(false);

    localPreferences.setStorageModeHintDismissed(true);
    expect(localPreferences.getStorageModeHintDismissed()).toBe(true);

    localPreferences.setStorageModeHintDismissed(false);
    expect(localPreferences.getStorageModeHintDismissed()).toBe(false);
  });
});
