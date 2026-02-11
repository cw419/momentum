import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { ThemeToggle } from '../ThemeToggle';
import { NotificationToggle } from '../NotificationToggle';
import { localPreferences } from '../../utils/localPreferences';
import { systemNotificationService } from '../../services/platform/SystemNotificationService';

const useSystemNotificationStateMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useSystemNotificationState', () => ({
  useSystemNotificationState: useSystemNotificationStateMock,
}));

function renderWithI18n(ui: React.ReactElement) {
  localStorage.setItem('language', 'en');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('Theme and notification toggles', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark');
    useSystemNotificationStateMock.mockReturnValue({
      initialized: true,
      supported: true,
      permission: 'granted',
      enabled: false,
      togglePlacement: 'topbar',
    });
  });

  describe('ThemeToggle', () => {
    it('uses stored theme and toggles to light', async () => {
      const getThemeSpy = vi
        .spyOn(localPreferences, 'getTheme')
        .mockReturnValue('dark');
      const setThemeSpy = vi
        .spyOn(localPreferences, 'setTheme')
        .mockImplementation(() => undefined);

      renderWithI18n(<ThemeToggle />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(setThemeSpy).toHaveBeenCalledWith('dark');

      await userEvent.click(
        screen.getByRole('button', { name: 'Toggle theme' }),
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
      expect(setThemeSpy).toHaveBeenLastCalledWith('light');

      getThemeSpy.mockRestore();
      setThemeSpy.mockRestore();
    });

    it('falls back to matchMedia preference when no stored theme', () => {
      vi.spyOn(localPreferences, 'getTheme').mockReturnValue(null);
      vi.spyOn(localPreferences, 'setTheme').mockImplementation(
        () => undefined,
      );
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches: query === '(prefers-color-scheme: dark)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as MediaQueryList,
      );

      renderWithI18n(<ThemeToggle />);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('NotificationToggle', () => {
    it('renders nothing when notifications are not supported', () => {
      useSystemNotificationStateMock.mockReturnValue({
        initialized: true,
        supported: false,
        permission: 'default',
        enabled: false,
        togglePlacement: 'hidden',
      });

      const { container } = renderWithI18n(
        <NotificationToggle placement="topbar" />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when placement does not match', () => {
      useSystemNotificationStateMock.mockReturnValue({
        initialized: true,
        supported: true,
        permission: 'granted',
        enabled: true,
        togglePlacement: 'settings',
      });

      const { container } = renderWithI18n(
        <NotificationToggle placement="topbar" />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('enables notifications when switch is turned on', async () => {
      useSystemNotificationStateMock.mockReturnValue({
        initialized: true,
        supported: true,
        permission: 'granted',
        enabled: false,
        togglePlacement: 'topbar',
      });
      const enableSpy = vi
        .spyOn(systemNotificationService, 'enable')
        .mockResolvedValue(true);
      vi.spyOn(systemNotificationService, 'disable').mockImplementation(
        () => undefined,
      );

      renderWithI18n(<NotificationToggle placement="topbar" />);

      const toggle = await screen.findByRole('switch', {
        name: 'Toggle system notifications',
      });
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      await userEvent.click(toggle);

      expect(enableSpy).toHaveBeenCalledTimes(1);
    });

    it('disables notifications when switch is turned off', async () => {
      useSystemNotificationStateMock.mockReturnValue({
        initialized: true,
        supported: true,
        permission: 'granted',
        enabled: true,
        togglePlacement: 'topbar',
      });
      vi.spyOn(systemNotificationService, 'enable').mockResolvedValue(true);
      const disableSpy = vi
        .spyOn(systemNotificationService, 'disable')
        .mockImplementation(() => undefined);

      renderWithI18n(<NotificationToggle placement="topbar" />);

      const toggle = await screen.findByRole('switch', {
        name: 'Toggle system notifications',
      });
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      await userEvent.click(toggle);

      expect(disableSpy).toHaveBeenCalledTimes(1);
    });
  });
});

