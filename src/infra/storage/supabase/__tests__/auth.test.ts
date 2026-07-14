import { describe, expect, it, vi } from 'vitest';
import { expectErr, expectOk } from '../../../../test/utils/resultAssertions';
import type { User } from '@supabase/supabase-js';

interface LoadAuthOptions {
  supabaseValue?: unknown;
  currentUser?: User | null;
  waitAuthResult?: { user: User | null; isAuthenticated: boolean };
  isAuthenticated?: boolean;
  signUpResult?: { error: { message?: string } | null };
  signInResult?: { error: { message?: string } | null };
  signOutResult?: { error: { message?: string } | null };
  emitAuthEvent?: boolean;
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: { role: 'member' },
    aud: 'authenticated',
    created_at: '2026-02-06T00:00:00.000Z',
    email: 'user@example.com',
    last_sign_in_at: '2026-02-06T08:00:00.000Z',
    ...overrides,
  } as User;
}

async function loadAuthModule(options: LoadAuthOptions = {}) {
  vi.resetModules();

  const user = Object.prototype.hasOwnProperty.call(options, 'currentUser')
    ? (options.currentUser ?? null)
    : createUser();
  const waitResult = options.waitAuthResult ?? { user, isAuthenticated: true };
  const signUpResult = options.signUpResult ?? { error: null };
  const signInResult = options.signInResult ?? { error: null };
  const signOutResult = options.signOutResult ?? { error: null };

  const supabaseGetCurrentUser = vi.fn().mockResolvedValue(user);
  const supabaseWaitForAuthentication = vi.fn().mockResolvedValue(waitResult);
  const supabaseIsUserAuthenticated = vi
    .fn()
    .mockResolvedValue(options.isAuthenticated ?? true);
  const supabaseSignUp = vi.fn().mockResolvedValue(signUpResult);
  const supabaseSignIn = vi.fn().mockResolvedValue(signInResult);
  const supabaseSignOut = vi.fn().mockResolvedValue(signOutResult);

  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn(
    (callback: (event: string, session: { user: User | null }) => void) => {
      if (options.emitAuthEvent !== false) {
        callback('SIGNED_IN', { user });
      }
      return { data: { subscription: { unsubscribe } } };
    },
  );

  const defaultSupabase = {
    auth: {
      onAuthStateChange,
    },
  };

  vi.doMock('../../../../lib/supabase', () => ({
    supabase:
      options.supabaseValue === undefined
        ? defaultSupabase
        : options.supabaseValue,
    getCurrentUser: supabaseGetCurrentUser,
    waitForAuthentication: supabaseWaitForAuthentication,
    isUserAuthenticated: supabaseIsUserAuthenticated,
    signUp: supabaseSignUp,
    signIn: supabaseSignIn,
    signOut: supabaseSignOut,
  }));

  const mod = await import('../auth');

  return {
    mod,
    mocks: {
      supabaseGetCurrentUser,
      supabaseWaitForAuthentication,
      supabaseIsUserAuthenticated,
      supabaseSignUp,
      supabaseSignIn,
      supabaseSignOut,
      onAuthStateChange,
      unsubscribe,
    },
  };
}

describe('supabase/auth', () => {
  it('returns NOT_CONFIGURED for getCurrentUser and waitForAuthentication when supabase is missing', async () => {
    const { mod } = await loadAuthModule({ supabaseValue: null });

    const currentUser = await mod.getCurrentUser();
    const currentUserError = expectErr(currentUser);
    expect(currentUserError.code).toBe('NOT_CONFIGURED');

    const authResult = await mod.waitForAuthentication();
    const authError = expectErr(authResult);
    expect(authError.code).toBe('NOT_CONFIGURED');
  });

  it('maps supabase user fields when getCurrentUser succeeds', async () => {
    const rawUser = createUser({
      id: 'user-42',
      email: 'u42@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      last_sign_in_at: '2026-02-06T06:00:00.000Z',
      user_metadata: { tier: 'pro' },
    });

    const { mod } = await loadAuthModule({ currentUser: rawUser });
    const result = await mod.getCurrentUser();

    const value = expectOk(result);
    expect(value).toEqual({
      id: 'user-42',
      email: 'u42@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastSignInAt: '2026-02-06T06:00:00.000Z',
      userMetadata: { tier: 'pro' },
    });
  });

  it('returns null user when no user is available', async () => {
    const { mod } = await loadAuthModule({ currentUser: null });
    const result = await mod.getCurrentUser();

    const value = expectOk(result);
    expect(value).toBeNull();
  });

  it('maps waitForAuthentication result', async () => {
    const authUser = createUser({ id: 'wait-user' });
    const { mod } = await loadAuthModule({
      waitAuthResult: { user: authUser, isAuthenticated: true },
    });

    const result = await mod.waitForAuthentication(1234);
    const value = expectOk(result);
    expect(value.isAuthenticated).toBe(true);
    expect(value.user?.id).toBe('wait-user');
  });

  it('returns false auth status when supabase is not configured', async () => {
    const { mod } = await loadAuthModule({ supabaseValue: null });
    const result = await mod.isUserAuthenticated();

    const value = expectOk(result);
    expect(value).toBe(false);
  });

  it('maps signIn/signUp/signOut errors to AppError codes', async () => {
    const { mod } = await loadAuthModule({
      signInResult: { error: { message: 'Network error while signing in' } },
      signUpResult: { error: { message: 'Supabase not configured' } },
      signOutResult: { error: { message: 'User not authenticated' } },
    });

    const signInResult = await mod.signIn('a@example.com', 'secret');
    const signInError = expectErr(signInResult);
    expect(signInError.code).toBe('NETWORK');

    const signUpResult = await mod.signUp('a@example.com', 'secret');
    const signUpError = expectErr(signUpResult);
    expect(signUpError.code).toBe('NOT_CONFIGURED');

    const signOutResult = await mod.signOut();
    const signOutError = expectErr(signOutResult);
    expect(signOutError.code).toBe('NOT_AUTHENTICATED');
  });

  it('returns ok on successful signIn/signUp/signOut', async () => {
    const { mod, mocks } = await loadAuthModule();

    await expect(mod.signIn('a@example.com', 'pw')).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(mod.signUp('a@example.com', 'pw')).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(mod.signOut()).resolves.toEqual({
      ok: true,
      value: undefined,
    });

    expect(mocks.supabaseSignIn).toHaveBeenCalledWith('a@example.com', 'pw');
    expect(mocks.supabaseSignUp).toHaveBeenCalledWith('a@example.com', 'pw');
    expect(mocks.supabaseSignOut).toHaveBeenCalledTimes(1);
  });

  it('maps unknown error messages to UNKNOWN code', async () => {
    const { mod } = await loadAuthModule({
      signInResult: { error: { message: 'Something odd happened' } },
    });
    const result = await mod.signIn('user@example.com', 'pw');

    const error = expectErr(result);
    expect(error.code).toBe('UNKNOWN');
  });

  it('handles auth state subscription and unsubscribe', async () => {
    const { mod, mocks } = await loadAuthModule({ emitAuthEvent: true });
    const callback = vi.fn();

    const subscription = mod.onAuthStateChange(callback);
    const subscriptionValue = expectOk(subscription);
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      'SIGNED_IN',
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'user-1',
          email: 'user@example.com',
        }),
      }),
    );

    subscriptionValue();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('returns NOT_CONFIGURED when subscribing without supabase', async () => {
    const { mod } = await loadAuthModule({ supabaseValue: null });
    const result = mod.onAuthStateChange(vi.fn());

    const error = expectErr(result);
    expect(error.code).toBe('NOT_CONFIGURED');
  });
});
