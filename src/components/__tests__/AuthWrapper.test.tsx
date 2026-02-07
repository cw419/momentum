import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { StorageProvider } from '../../storage/StorageContext';
import { err, ok } from '../../domain/result';

vi.mock('../IntroScreen', () => ({
  IntroScreen: ({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) => (
    <div data-testid="intro-screen">
      <button type="button" onClick={onSignIn}>
        intro-sign-in
      </button>
      <button type="button" onClick={onSignUp}>
        intro-sign-up
      </button>
    </div>
  ),
}));

vi.mock('../AuthForm', () => ({
  AuthForm: ({ initialIsSignUp, onBack }: { initialIsSignUp: boolean; onBack: () => void }) => (
    <div data-testid="auth-form">
      <span>{initialIsSignUp ? 'signup' : 'signin'}</span>
      <button type="button" onClick={onBack}>
        auth-back
      </button>
    </div>
  ),
}));

import { AuthWrapper } from '../AuthWrapper';

function renderWrapper(storage: any) {
  localStorage.setItem('language', 'en');
  render(
    <I18nProvider>
      <StorageProvider storage={storage}>
        <AuthWrapper>
          <div data-testid="protected-content">protected</div>
        </AuthWrapper>
      </StorageProvider>
    </I18nProvider>
  );
}

describe('AuthWrapper', () => {
  it('renders children directly when storage is local', () => {
    renderWrapper({ kind: 'local' });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows loading screen while waiting for authentication', () => {
    renderWrapper({
      kind: 'supabase',
      onAuthStateChange: vi.fn(() => ok(() => undefined)),
      waitForAuthentication: vi.fn(
        () =>
          new Promise(() => {
            // keep pending to assert loading state
          })
      ),
    });

    expect(screen.getByRole('heading', { name: /Authenticating/i })).toBeInTheDocument();
  });

  it('navigates intro -> auth form and back, preserving sign-in/sign-up intent', async () => {
    renderWrapper({
      kind: 'supabase',
      onAuthStateChange: vi.fn(() => ok(() => undefined)),
      waitForAuthentication: vi.fn().mockResolvedValue(ok({ user: null, isAuthenticated: false })),
    });

    expect(await screen.findByTestId('intro-screen')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'intro-sign-in' }));
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    expect(screen.getByText('signin')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'auth-back' }));
    expect(screen.getByTestId('intro-screen')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'intro-sign-up' }));
    expect(screen.getByText('signup')).toBeInTheDocument();
  });

  it('falls back to intro when waitForAuthentication fails', async () => {
    renderWrapper({
      kind: 'supabase',
      onAuthStateChange: vi.fn(() => ok(() => undefined)),
      waitForAuthentication: vi
        .fn()
        .mockResolvedValue(err({ code: 'AUTH_TIMEOUT', message: 'Timed out waiting for auth' })),
    });

    expect(await screen.findByTestId('intro-screen')).toBeInTheDocument();
  });

  it('renders protected children after auth state callback receives a user', async () => {
    let authCallback: ((event: string, session: { user: { id: string } | null }) => void) | undefined;

    const onAuthStateChange = vi.fn((callback) => {
      authCallback = callback;
      return ok(() => undefined);
    });

    renderWrapper({
      kind: 'supabase',
      onAuthStateChange,
      waitForAuthentication: vi.fn().mockResolvedValue(ok({ user: null, isAuthenticated: false })),
    });

    await waitFor(() => {
      expect(onAuthStateChange).toHaveBeenCalled();
    });

    act(() => {
      authCallback?.('SIGNED_IN', { user: { id: 'user-1' } });
    });

    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
  });
});
