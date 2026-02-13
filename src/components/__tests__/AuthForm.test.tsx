import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { StorageProvider } from '../../storage/StorageContext';
import { AuthForm } from '../AuthForm';
import { err, ok } from '../../domain/result';

function renderAuthForm(
  storageOverrides: Partial<Record<'signIn' | 'signUp', any>> = {},
) {
  localStorage.setItem('language', 'en');

  const storage = {
    kind: 'supabase',
    signIn: vi.fn().mockResolvedValue(ok({ user: { id: 'user-1' } })),
    signUp: vi.fn().mockResolvedValue(ok({ user: null })),
    ...storageOverrides,
  };

  render(
    <I18nProvider>
      <StorageProvider storage={storage as any}>
        <AuthForm onBack={vi.fn()} />
      </StorageProvider>
    </I18nProvider>,
  );

  return storage;
}

describe('AuthForm', () => {
  it('submits sign-in successfully', async () => {
    const storage = renderAuthForm();

    await userEvent.type(
      screen.getByPlaceholderText('Enter your email'),
      'test@example.com',
    );
    await userEvent.type(
      screen.getByPlaceholderText('Enter your password'),
      'secret123',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(storage.signIn).toHaveBeenCalledWith(
        'test@example.com',
        'secret123',
      );
    });
  });

  it('toggles password visibility and sign-up flow', async () => {
    const storage = renderAuthForm();

    const passwordInput = screen.getByPlaceholderText(
      'Enter your password',
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    await userEvent.click(
      screen.getByRole('button', { name: 'Show password' }),
    );
    expect(passwordInput.type).toBe('text');

    await userEvent.click(
      screen.getByRole('button', { name: 'Switch to sign up' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Create Account' }),
    ).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText('Enter your email'),
      'new@example.com',
    );
    await userEvent.type(
      screen.getByPlaceholderText('Enter your password'),
      'newpass123',
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Create Account' }),
    );

    await waitFor(() => {
      expect(storage.signUp).toHaveBeenCalledWith(
        'new@example.com',
        'newpass123',
      );
    });
    expect(
      screen.getByText('Account created! Please check your email to confirm.'),
    ).toBeInTheDocument();
  });

  it('shows safe error detail for failed sign-in and unexpected errors', async () => {
    const storage = renderAuthForm({
      signIn: vi
        .fn()
        .mockResolvedValueOnce(
          err({ code: 'AUTH_FAILED', message: 'Invalid credentials' }),
        )
        .mockRejectedValueOnce(new Error('Unexpected crash')),
    });

    await userEvent.type(
      screen.getByPlaceholderText('Enter your email'),
      'bad@example.com',
    );
    await userEvent.type(
      screen.getByPlaceholderText('Enter your password'),
      'wrong',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText('Unexpected crash')).toBeInTheDocument();

    expect(storage.signIn).toHaveBeenCalledTimes(2);
  });

  it('goes back when back button is clicked', async () => {
    const onBack = vi.fn();
    localStorage.setItem('language', 'en');

    render(
      <I18nProvider>
        <StorageProvider
          storage={
            {
              kind: 'supabase',
              signIn: vi.fn().mockResolvedValue(ok({ user: { id: 'u1' } })),
              signUp: vi.fn().mockResolvedValue(ok({ user: null })),
            } as any
          }
        >
          <AuthForm onBack={onBack} />
        </StorageProvider>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows local mode switch entry when callback is provided', async () => {
    const onUseLocalMode = vi.fn();
    localStorage.setItem('language', 'en');

    render(
      <I18nProvider>
        <StorageProvider
          storage={
            {
              kind: 'supabase',
              signIn: vi.fn().mockResolvedValue(ok({ user: { id: 'u1' } })),
              signUp: vi.fn().mockResolvedValue(ok({ user: null })),
            } as any
          }
        >
          <AuthForm onBack={vi.fn()} onUseLocalMode={onUseLocalMode} />
        </StorageProvider>
      </I18nProvider>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Switch to local mode' }),
    );
    expect(onUseLocalMode).toHaveBeenCalledTimes(1);
  });
});
