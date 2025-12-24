import React, { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useI18n } from '../i18n';

type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle: React.FC = () => {
    const { tr } = useI18n();
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme') as Theme) || 'system';
        }
        return 'system';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const cycleTheme = () => {
        setTheme((prev) => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'system';
            return 'light';
        });
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
            {theme === 'system' && <Monitor size={18} strokeWidth={2} />}
        </button>
    );
};
