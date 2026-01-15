import { useCallback, useState } from 'react';
import { useI18n } from '../i18n';

export function useThemeAnnouncer() {
  const { tr } = useI18n();
  const [announcement, setAnnouncement] = useState('');

  const announceThemeChange = useCallback(
    (theme: 'light' | 'dark') => {
      const messages = {
        light: tr('已切换到浅色模式', 'Switched to light mode'),
        dark: tr('已切换到深色模式', 'Switched to dark mode'),
      } as const;

      setAnnouncement(messages[theme]);
    },
    [tr]
  );

  const clearAnnouncement = useCallback(() => {
    setAnnouncement('');
  }, []);

  return {
    announcement,
    announceThemeChange,
    clearAnnouncement,
  };
}

