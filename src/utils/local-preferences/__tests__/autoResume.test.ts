import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../keys';
import { clearAutoResume, getAutoResume, setAutoResume } from '../autoResume';

describe('local-preferences/autoResume', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no auto-resume payload exists', () => {
    expect(getAutoResume()).toBeNull();
  });

  it('persists and reads auto-resume payloads', () => {
    const payload = {
      chainId: 'chain-1',
      startedAt: '2026-02-01T10:00:00.000Z',
      resumeAt: '2026-02-01T10:05:00.000Z',
    };

    setAutoResume(payload);
    expect(getAutoResume()).toEqual(payload);
  });

  it('returns null for malformed JSON and clears persisted value', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTO_RESUME, '{bad-json');
    expect(getAutoResume()).toBeNull();

    localStorage.setItem(
      LOCAL_STORAGE_KEYS.AUTO_RESUME,
      JSON.stringify({ chainId: 'chain-2' }),
    );
    clearAutoResume();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.AUTO_RESUME)).toBeNull();
  });
});
