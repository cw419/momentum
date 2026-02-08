import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../domain/auth';
import { err, ok } from '../../domain/result';
import type { GamblingSettings } from '../../domain/userSettings';
import { I18nProvider } from '../../i18n';
import { StorageProvider } from '../../storage/StorageContext';
import { AccountModal } from '../AccountModal';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSignInAt: '2026-01-02T00:00:00.000Z',
    userMetadata: { full_name: 'Test User' },
    ...overrides,
  };
}

const defaultGamblingSettings: GamblingSettings = {
  gambling_mode_enabled: false,
  daily_bet_limit: null,
  max_single_bet: null,
};

function appError(message: string) {
  return {
    code: 'TEST_ERROR',
    message,
  };
}

function createSupabaseStorage(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'supabase' as const,
    getCurrentUser: vi.fn().mockResolvedValue(ok(createUser())),
    getGamblingSettings: vi.fn().mockResolvedValue(ok(defaultGamblingSettings)),
    toggleGamblingMode: vi
      .fn()
      .mockResolvedValue(ok({ success: true, message: 'ok' })),
    signOut: vi.fn().mockResolvedValue(ok(undefined)),
    ...overrides,
  };
}

function renderAccountModal(
  storage: ReturnType<typeof createSupabaseStorage>,
  onClose = vi.fn(),
) {
  render(
    <I18nProvider>
      <StorageProvider storage={storage as any}>
        <AccountModal isOpen={true} onClose={onClose} />
      </StorageProvider>
    </I18nProvider>,
  );
  return { onClose };
}

describe('AccountModal behavior', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
  });

  it('shows loading first and then renders user content after successful fetch', async () => {
    const deferred = createDeferred<ReturnType<typeof ok<AuthUser | null>>>();
    const storage = createSupabaseStorage({
      getCurrentUser: vi.fn().mockReturnValue(deferred.promise),
    });

    renderAccountModal(storage);
    expect(screen.getByText('Loading account...')).toBeInTheDocument();

    act(() => {
      deferred.resolve(ok(createUser({ email: 'loaded@example.com' })));
    });

    expect(await screen.findByText('loaded@example.com')).toBeInTheDocument();
    expect(storage.getGamblingSettings).toHaveBeenCalledTimes(1);
  });

  it('renders retry flow when loading user fails once', async () => {
    const user = userEvent.setup();
    const storage = createSupabaseStorage({
      getCurrentUser: vi
        .fn()
        .mockResolvedValueOnce(err(appError('user fetch failed')))
        .mockResolvedValueOnce(ok(createUser({ email: 'retry@example.com' }))),
    });

    renderAccountModal(storage);
    expect(await screen.findByText('user fetch failed')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Retry loading user info' }),
    );

    await waitFor(() => {
      expect(storage.getCurrentUser).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('retry@example.com')).toBeInTheDocument();
  });

  it('renders empty user state when getCurrentUser returns null', async () => {
    const storage = createSupabaseStorage({
      getCurrentUser: vi.fn().mockResolvedValue(ok(null)),
    });

    renderAccountModal(storage);

    expect(await screen.findByText('User info not found')).toBeInTheDocument();
  });

  it('toggles gambling mode successfully and schedules success message clear', async () => {
    const storage = createSupabaseStorage({
      getCurrentUser: vi.fn().mockResolvedValue(ok(createUser())),
      getGamblingSettings: vi
        .fn()
        .mockResolvedValue(ok(defaultGamblingSettings)),
      toggleGamblingMode: vi
        .fn()
        .mockResolvedValue(ok({ success: true, message: 'updated' })),
    });
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    renderAccountModal(storage);

    const toggle = await screen.findByRole('switch', {
      name: 'Toggle gambling mode',
    });
    fireEvent.click(toggle);

    expect(storage.toggleGamblingMode).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText('Gambling mode enabled'),
    ).toBeInTheDocument();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);
    setTimeoutSpy.mockRestore();
  });

  it('shows and dismisses gambling toggle errors for unsuccessful updates', async () => {
    const user = userEvent.setup();
    const storage = createSupabaseStorage({
      toggleGamblingMode: vi
        .fn()
        .mockResolvedValue(ok({ success: false, message: 'toggle rejected' })),
    });

    renderAccountModal(storage);

    await user.click(
      await screen.findByRole('switch', { name: 'Toggle gambling mode' }),
    );

    expect(await screen.findByText('toggle rejected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss error' }));

    await waitFor(() => {
      expect(screen.queryByText('toggle rejected')).not.toBeInTheDocument();
    });
  });

  it('shows gambling settings load errors from storage', async () => {
    const storage = createSupabaseStorage({
      getGamblingSettings: vi
        .fn()
        .mockResolvedValue(err(appError('settings fetch failed'))),
    });

    renderAccountModal(storage);

    expect(
      await screen.findByText('settings fetch failed'),
    ).toBeInTheDocument();
  });

  it('shows generic fallback when user loading throws', async () => {
    const storage = createSupabaseStorage({
      getCurrentUser: vi
        .fn()
        .mockRejectedValue(new Error('unexpected user crash')),
    });

    renderAccountModal(storage);

    expect(
      await screen.findByText('Failed to load user info'),
    ).toBeInTheDocument();
  });

  it('shows generic fallback when loading gambling settings throws', async () => {
    const storage = createSupabaseStorage({
      getCurrentUser: vi.fn().mockResolvedValue(ok(createUser())),
      getGamblingSettings: vi
        .fn()
        .mockRejectedValue(new Error('settings crash')),
    });

    renderAccountModal(storage);

    expect(
      await screen.findByText('Failed to load settings'),
    ).toBeInTheDocument();
  });

  it('shows gambling errors for failed result payloads and thrown exceptions', async () => {
    const user = userEvent.setup();
    const toggleGamblingMode = vi
      .fn()
      .mockResolvedValueOnce(err(appError('toggle failed')))
      .mockRejectedValueOnce(new Error('toggle crashed'));
    const storage = createSupabaseStorage({
      toggleGamblingMode,
    });

    renderAccountModal(storage);

    await user.click(
      await screen.findByRole('switch', { name: 'Toggle gambling mode' }),
    );
    expect(await screen.findByText('toggle failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss error' }));
    await user.click(
      screen.getByRole('switch', { name: 'Toggle gambling mode' }),
    );
    expect(await screen.findByText('toggle crashed')).toBeInTheDocument();
  });

  it('keeps modal open and shows error on sign out failure', async () => {
    const user = userEvent.setup();
    const signOutMock = vi
      .fn()
      .mockResolvedValue(err(appError('cannot sign out')));
    const storage = createSupabaseStorage({
      signOut: signOutMock,
    });
    const { onClose } = renderAccountModal(storage);

    const signOutButton = await screen.findByRole('button', {
      name: 'Sign out',
    });

    await user.click(signOutButton);
    expect(await screen.findByText('cannot sign out')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes modal after successful sign out', async () => {
    const user = userEvent.setup();
    const storage = createSupabaseStorage({
      signOut: vi.fn().mockResolvedValue(ok(undefined)),
    });
    const { onClose } = renderAccountModal(storage);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows fallback sign-out message when signOut throws', async () => {
    const user = userEvent.setup();
    const storage = createSupabaseStorage({
      signOut: vi.fn().mockRejectedValue(new Error('sign out crashed')),
    });
    const { onClose } = renderAccountModal(storage);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByText('Sign out failed. Please try again.'),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
