import type { StorageMode } from '../../storage/storageModeContextValue';

interface AccountModalStorageSectionProps {
  mode: StorageMode;
  canUseSupabase: boolean;
  tr: (zh: string, en: string) => string;
  onSwitchToLocal: () => void;
  onSwitchToSupabase: () => void;
}

export function AccountModalStorageSection({
  mode,
  canUseSupabase,
  tr,
  onSwitchToLocal,
  onSwitchToSupabase,
}: AccountModalStorageSectionProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700">
      <div>
        <h3 className="font-chinese text-base font-medium text-gray-900 dark:text-slate-100">
          {tr('数据模式', 'Data mode')}
        </h3>
        <p className="font-chinese text-xs text-gray-500 dark:text-slate-400">
          {tr(
            '本地模式离线可用；云端模式支持登录与多端同步',
            'Local mode works offline; cloud mode enables sign-in and multi-device sync',
          )}
        </p>
      </div>

      <div
        className="flex items-center space-x-2"
        role="radiogroup"
        aria-label={tr('数据模式', 'Data mode')}
      >
        <button
          type="button"
          onClick={onSwitchToLocal}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition duration-200 ${
            mode === 'local'
              ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
          aria-checked={mode === 'local'}
          role="radio"
        >
          {tr('本地模式', 'Local mode')}
        </button>
        <button
          type="button"
          onClick={onSwitchToSupabase}
          disabled={!canUseSupabase}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition duration-200 ${
            mode === 'supabase'
              ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          aria-checked={mode === 'supabase'}
          role="radio"
        >
          {tr('云端模式', 'Cloud mode')}
        </button>
      </div>

      {!canUseSupabase && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {tr(
            '未检测到 Supabase 配置，当前仅支持本地模式。',
            'Supabase is not configured, so only local mode is available.',
          )}
        </p>
      )}
    </div>
  );
}
