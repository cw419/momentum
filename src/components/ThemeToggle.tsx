import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../i18n';

type Theme = 'light' | 'dark';

export const ThemeToggle: React.FC = () => {
    const { tr } = useI18n();
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme');
            if (stored === 'light' || stored === 'dark') return stored;

            // Migrate old `system` value (or unset/invalid) to an explicit theme.
            const prefersDark =
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'dark') root.classList.add('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const cycleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <button
            onClick={cycleTheme}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition-colors"
            aria-label={tr('切换主题', 'Toggle theme')}
            title={tr('切换主题', 'Toggle theme')}
        >
            {theme === 'light' && <Sun size={18} strokeWidth={2} />}
            {theme === 'dark' && <Moon size={18} strokeWidth={2} />}
        </button>
    );
};
