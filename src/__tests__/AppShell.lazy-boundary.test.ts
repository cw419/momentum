import { describe, expect, test } from 'vitest';
import AppShell from '../AppShell';
import AppShellContainer from '../app/AppShellContainer';

describe('AppShell', () => {
  test('does not export AppShellContainer directly (enables lazy loading boundary)', () => {
    expect(AppShell).not.toBe(AppShellContainer);
  });
});

