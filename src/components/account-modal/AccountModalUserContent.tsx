import { Dices, LogOut, User, X } from 'lucide-react';
import type { AuthUser } from '../../domain/auth';
import type { GamblingSettings } from '../../domain/userSettings';
import { Switch } from '../Switch';

interface AccountModalUserContentProps {
  user: AuthUser;
  userFullName: string | null;
  locale: Intl.LocalesArgument;
  tr: (zh: string, en: string) => string;
  gamblingSettings: GamblingSettings;
  gamblingLoading: boolean;
  gamblingError: string | null;
  gamblingSuccess: string | null;
  signingOut: boolean;
  onToggleGambling: () => void;
  onDismissGamblingError: () => void;
  onSignOut: () => void;
}

const formatLocaleDateOrDash = (dateString: string | null | undefined, locale: Intl.LocalesArgument) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(locale);
};

export function AccountModalUserContent({
  user,
  userFullName,
  locale,
  tr,
  gamblingSettings,
  gamblingLoading,
  gamblingError,
  gamblingSuccess,
  signingOut,
  onToggleGambling,
  onDismissGamblingError,
  onSignOut
}: AccountModalUserContentProps) {
  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
          <User className="text-white" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium font-chinese text-gray-900 dark:text-slate-100 mb-1">
            {tr('当前账号', 'Account')}
          </h3>
          <p className="text-gray-600 dark:text-slate-400 text-sm truncate">{user.email}</p>
          {userFullName && <p className="text-gray-500 dark:text-slate-500 text-xs">{userFullName}</p>}
        </div>
      </div>

      {/* Account Details */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-chinese text-gray-600 dark:text-slate-400">
            {tr('注册时间', 'Created')}
          </span>
          <span className="text-sm text-gray-900 dark:text-slate-100">
            {formatLocaleDateOrDash(user.createdAt, locale)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-chinese text-gray-600 dark:text-slate-400">
            {tr('最后登录', 'Last sign in')}
          </span>
          <span className="text-sm text-gray-900 dark:text-slate-100">
            {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString(locale) : tr('首次登录', 'First sign in')}
          </span>
        </div>
      </div>

      {/* 狂赌模式设置 */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-2xl border border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Dices className="text-white" size={16} />
            </div>
            <div>
              <h4 className="text-base font-medium font-chinese text-gray-900 dark:text-slate-100">
                {tr('狂赌模式', 'Gambling mode')}
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {tr('在任务上押注积分以获得额外奖励', 'Bet points on tasks for extra rewards')}
              </p>
            </div>
          </div>

          <Switch
            checked={gamblingSettings.gambling_mode_enabled}
            onCheckedChange={() => onToggleGambling()}
            disabled={gamblingLoading}
            loading={gamblingLoading}
            variant="danger"
            aria-label={tr('切换狂赌模式', 'Toggle gambling mode')}
          />
        </div>

        {/* 状态说明 */}
        <div className="text-xs text-gray-600 dark:text-slate-400">
          {gamblingSettings.gambling_mode_enabled ? (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{tr('已启用 - 可在任务开始时进行押注', 'Enabled — you can bet when starting a task')}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>{tr('已禁用 - 无法进行任务押注', 'Disabled — betting is unavailable')}</span>
            </div>
          )}
        </div>

        {/* 成功消息 */}
        {gamblingSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">{gamblingSuccess}</p>
          </div>
        )}

        {/* 错误消息 */}
        {gamblingError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-300">{gamblingError}</p>
              <button
                type="button"
                onClick={onDismissGamblingError}
                aria-label={tr('关闭错误消息', 'Dismiss error')}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        aria-label={tr('退出登录', 'Sign out')}
        className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-chinese border border-red-200 dark:border-red-800"
      >
        {signingOut ? (
          <>
            <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
            <span>{tr('正在退出...', 'Signing out...')}</span>
          </>
        ) : (
          <>
            <LogOut size={20} />
            <span>{tr('退出登录', 'Sign out')}</span>
          </>
        )}
      </button>
    </div>
  );
}
