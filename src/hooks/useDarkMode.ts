import { useState, useEffect } from 'react';
import { applyThemeWithTransition } from '../utils/theme';
import { localPreferences } from '../utils/localPreferences';

export type Theme = 'light' | 'dark';

interface UseDarkModeReturn {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useDarkMode = (): UseDarkModeReturn => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';

    // Check localStorage first
    const stored = localPreferences.getTheme();
    if (stored) return stored;

    // Migrate old `system` value (or unset/invalid) to an explicit theme.
    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  const [isDark, setIsDark] = useState(false);

  // Function to apply theme to document
  const applyTheme = (currentTheme: Theme) => {
    const shouldBeDark = currentTheme === 'dark';
    
    // Apply theme with smooth transition
    applyThemeWithTransition(shouldBeDark ? 'dark' : 'light');
    
    // Set data attribute for CSS
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', shouldBeDark ? '#161615' : '#FDFDFD');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = shouldBeDark ? '#161615' : '#FDFDFD';
      document.head.appendChild(meta);
    }
    
    setIsDark(shouldBeDark);
  };

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localPreferences.setTheme(newTheme);

    applyTheme(newTheme);
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
};
