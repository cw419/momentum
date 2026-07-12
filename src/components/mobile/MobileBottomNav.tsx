import { Home, Target, Brain, Settings } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ViewState } from '../../types/app-state';

interface MobileBottomNavProps {
  currentView: ViewState;
  hasActiveSession: boolean;
  onNavigate: (view: ViewState) => void;
  onOpenSettings: () => void;
}

function getTabColorClass(isActive: boolean, disabled: boolean): string {
  if (isActive) return 'text-indigo-600 dark:text-indigo-400';
  if (disabled) return 'text-gray-300 dark:text-gray-600';
  return 'text-gray-500 dark:text-gray-400';
}

export function MobileBottomNav({
  currentView,
  hasActiveSession,
  onNavigate,
  onOpenSettings,
}: MobileBottomNavProps) {
  const { tr } = useI18n();

  const hiddenViews: ViewState[] = [
    'editor',
    'detail',
    'group',
    'taskgroup-editor',
    'focus',
  ];
  if (hiddenViews.includes(currentView)) return null;

  const tabs = [
    {
      id: 'dashboard' as const,
      icon: Home,
      label: tr('首页', 'Home'),
      isActive: currentView === 'dashboard',
      onPress: () => onNavigate('dashboard'),
    },
    {
      id: 'focus' as const,
      icon: Target,
      label: tr('专注', 'Focus'),
      isActive: false,
      disabled: !hasActiveSession,
      onPress: () => onNavigate('focus'),
    },
    {
      id: 'rsip' as const,
      icon: Brain,
      label: tr('RSIP', 'RSIP'),
      isActive: currentView === 'rsip',
      onPress: () => onNavigate('rsip'),
    },
    {
      id: 'settings' as const,
      icon: Settings,
      label: tr('设置', 'Settings'),
      isActive: false,
      onPress: onOpenSettings,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200/60 bg-white/95 backdrop-blur-md dark:border-gray-700/60 dark:bg-gray-900/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={tr('底部导航', 'Bottom navigation')}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const disabled = Boolean('disabled' in tab && tab.disabled);
          const colorClass = getTabColorClass(tab.isActive, disabled);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onPress}
              disabled={disabled}
              aria-label={tab.label}
              aria-current={tab.isActive ? 'page' : undefined}
              className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${colorClass}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
