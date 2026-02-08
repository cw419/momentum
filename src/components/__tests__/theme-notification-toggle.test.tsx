import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { ThemeToggle } from '../ThemeToggle';
import { NotificationToggle } from '../NotificationToggle';
import { localPreferences } from '../../utils/localPreferences';
import { notificationManager } from '../../utils/notifications';

function renderWithI18n(ui: React.ReactElement) {
  localStorage.setItem('language', 'en');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('Theme and notification toggles', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark');
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
      vi.spyOn(notificationManager, 'isSupported').mockReturnValue(false);

      const { container } = renderWithI18n(<NotificationToggle />);
      expect(container).toBeEmptyDOMElement();
    });

    it('enables notifications when switch is turned on', async () => {
      vi.spyOn(notificationManager, 'isSupported').mockReturnValue(true);
      vi.spyOn(notificationManager, 'isNotificationsEnabled').mockReturnValue(
        false,
      );
      const enableSpy = vi
        .spyOn(notificationManager, 'enableNotifications')
        .mockResolvedValue(true);
      vi.spyOn(notificationManager, 'disableNotifications').mockImplementation(
        () => undefined,
      );

      renderWithI18n(<NotificationToggle />);

      const toggle = await screen.findByRole('switch', {
        name: 'Toggle desktop notifications',
      });
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      await userEvent.click(toggle);

      expect(enableSpy).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(
          screen.getByRole('switch', { name: 'Toggle desktop notifications' }),
        ).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('disables notifications when switch is turned off', async () => {
      vi.spyOn(notificationManager, 'isSupported').mockReturnValue(true);
      vi.spyOn(notificationManager, 'isNotificationsEnabled').mockReturnValue(
        true,
      );
      vi.spyOn(notificationManager, 'enableNotifications').mockResolvedValue(
        true,
      );
      const disableSpy = vi
        .spyOn(notificationManager, 'disableNotifications')
        .mockImplementation(() => undefined);

      renderWithI18n(<NotificationToggle />);

      const toggle = await screen.findByRole('switch', {
        name: 'Toggle desktop notifications',
      });
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      await userEvent.click(toggle);

      expect(disableSpy).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(
          screen.getByRole('switch', { name: 'Toggle desktop notifications' }),
        ).toHaveAttribute('aria-checked', 'false');
      });
    });
  });
});
