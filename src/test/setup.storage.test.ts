import { describe, expect, it } from 'vitest';

describe('shared test storage harness', () => {
  it('keeps localStorage and sessionStorage independent', () => {
    localStorage.setItem('scope', 'local');
    sessionStorage.setItem('scope', 'session');

    expect(localStorage.getItem('scope')).toBe('local');
    expect(sessionStorage.getItem('scope')).toBe('session');
  });

  it('preserves empty-string values like browser Storage', () => {
    localStorage.setItem('empty', '');

    expect(localStorage.getItem('empty')).toBe('');
  });
});
