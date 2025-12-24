import React, { useState, useEffect } from 'react';
import { X, User, LogOut, AlertCircle, Dices, Loader2 } from 'lucide-react';
import type { AuthUser } from '../domain/auth';
import type { GamblingSettings } from '../domain/userSettings';
import { useStorage } from '../storage/StorageContext';
import { useI18n } from '../i18n';
import { logger } from '../utils/logger';
import { getSafeErrorDetail } from '../utils/errorMessage';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const storage = useStorage();
  const { language, locale, setLanguage, t, tr } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 狂赌模式相关状态
  const [gamblingSettings, setGamblingSettings] = useState<GamblingSettings>({
    gambling_mode_enabled: false,
    daily_bet_limit: null,
    max_single_bet: null
  });
  const [gamblingLoading, setGamblingLoading] = useState(false);
  const [gamblingError, setGamblingError] = useState<string | null>(null);
  const [gamblingSuccess, setGamblingSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (storage.kind !== 'supabase') {
        setUser(null);
        setLoading(false);
        return;
      }

      loadUser();
      loadGamblingSettings();
    }
  }, [isOpen, storage.kind]);

  const loadUser = async () => {
    if (storage.kind !== 'supabase') return;
    setLoading(true);
    setError(null);
    try {
      const result = await storage.getCurrentUser();
      if (!result.ok) {
        setUser(null);
        const safeDetail = getSafeErrorDetail(result.error.message || '', language);
        setError(safeDetail ?? tr('获取用户信息失败，请重试（详情见控制台）', 'Failed to load user info. Check the console for details, then try again.'));
        return;
      }

      setUser(result.value);
    } catch (err) {
      logger.error('ACCOUNT', 'Failed to get user info', undefined, err as Error);
      setError(tr('获取用户信息失败', 'Failed to load user info'));
    } finally {
      setLoading(false);
    }
  };

  // 加载狂赌模式设置
  const loadGamblingSettings = async () => {
    if (storage.kind !== 'supabase') return;
    try {
      setGamblingError(null);
      const settingsResult = await storage.getGamblingSettings();
      if (!settingsResult.ok) {
        const safeDetail = getSafeErrorDetail(settingsResult.error.message || '', language);
        setGamblingError(safeDetail ?? tr('获取设置失败，请重试（详情见控制台）', 'Failed to load settings. Check the console for details, then try again.'));
        return;
      }
      setGamblingSettings(settingsResult.value);
    } catch (err) {
      logger.error('ACCOUNT', 'Failed to load gambling settings', undefined, err as Error);
      setGamblingError(tr('获取设置失败', 'Failed to load settings'));
    }
  };

  // 切换狂赌模式
  const handleGamblingToggle = async () => {
    if (storage.kind !== 'supabase') return;
    setGamblingLoading(true);
    setGamblingError(null);
    setGamblingSuccess(null);
    
    try {
      const nextEnabled = !gamblingSettings.gambling_mode_enabled;
      const result = await storage.toggleGamblingMode();
      
      if (!result.ok) {
        const safeDetail = getSafeErrorDetail(result.error.message || '', language);
        setGamblingError(safeDetail ?? tr('设置更新失败，请重试（详情见控制台）', 'Failed to update settings. Check the console for details, then try again.'));
        return;
      }

      if (result.value.success) {
        setGamblingSettings(prev => ({
          ...prev,
          gambling_mode_enabled: !prev.gambling_mode_enabled
        }));
        setGamblingSuccess(nextEnabled ? tr('狂赌模式已启用', 'Gambling mode enabled') : tr('狂赌模式已禁用', 'Gambling mode disabled'));
        
        // 3秒后清除成功消息
        setTimeout(() => setGamblingSuccess(null), 3000);
      } else {
        const safeDetail = getSafeErrorDetail(result.value.message || '', language);
        setGamblingError(safeDetail ?? tr('设置更新失败，请重试（详情见控制台）', 'Failed to update settings. Check the console for details, then try again.'));
      }
    } catch (err) {
      logger.error('ACCOUNT', 'Failed to toggle gambling mode', undefined, err as Error);
      const safeDetail = err instanceof Error ? getSafeErrorDetail(err.message, language) : null;
      setGamblingError(safeDetail ?? tr('设置更新失败，请重试（详情见控制台）', 'Failed to update settings. Check the console for details, then try again.'));
    } finally {
      setGamblingLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (storage.kind !== 'supabase') return;
    setSigningOut(true);
    setError(null);
    try {
      const result = await storage.signOut();
      if (!result.ok) {
        const safeDetail = getSafeErrorDetail(result.error.message || '', language);
        setError(safeDetail ?? tr('退出登录失败，请重试（详情见控制台）', 'Sign out failed. Check the console for details, then try again.'));
        return;
      }

      onClose();
    } catch (err) {
      logger.error('ACCOUNT', 'Sign out failed', undefined, err as Error);
      setError(tr('退出登录失败，请重试', 'Sign out failed. Please try again.'));
    } finally {
      setSigningOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Language */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-2xl border border-gray-200 dark:border-slate-600">
            <div>
              <h3 className="text-base font-medium font-chinese text-gray-900 dark:text-slate-100">
                {t('settings.language.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-chinese">
                {t('settings.language.description')}
              </p>
            </div>
            <div className="flex items-center space-x-2" role="radiogroup" aria-label={t('settings.language.title')}>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  language === 'en'
                    ? 'bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'bg-white/80 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                }`}
                aria-checked={language === 'en'}
                role="radio"
              >
                {t('language.english')}
              </button>
              <button
                type="button"
                onClick={() => setLanguage('zh')}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  language === 'zh'
                    ? 'bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'bg-white/80 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                }`}
                aria-checked={language === 'zh'}
                role="radio"
              >
                {t('language.chinese')}
              </button>
            </div>
          </div>

          {storage.kind !== 'supabase' ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <User className="text-gray-400 dark:text-slate-500" size={24} />
              </div>
              <p className="text-gray-600 dark:text-slate-400 font-chinese">
                {tr('当前使用本地存储模式，无需账号登录', 'Using local storage — no account required.')}
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600 dark:text-slate-400 font-chinese">
                {tr('正在获取账号信息...', 'Loading account...')}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-500 dark:text-red-400" size={24} />
              </div>
              <p className="text-red-600 dark:text-red-400 font-chinese mb-4">
                {error}
              </p>
              <button
                onClick={loadUser}
                className="text-primary-500 hover:text-primary-600 font-medium transition-colors font-chinese"
              >
                {tr('重试', 'Retry')}
              </button>
            </div>
          ) : user ? (
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
                  <p className="text-gray-600 dark:text-slate-400 text-sm truncate">
                    {user.email}
                  </p>
                  {(user.userMetadata as any)?.full_name && (
                    <p className="text-gray-500 dark:text-slate-500 text-xs">
                      {(user.userMetadata as any).full_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-chinese text-gray-600 dark:text-slate-400">
                    {tr('注册时间', 'Created')}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-slate-100">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-chinese text-gray-600 dark:text-slate-400">
                    {tr('最后登录', 'Last sign in')}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-slate-100">
                    {user.lastSignInAt 
                      ? new Date(user.lastSignInAt).toLocaleDateString(locale)
                      : tr('首次登录', 'First sign in')
                    }
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
                  
                  {/* 切换开关 */}
                  <button
                    onClick={handleGamblingToggle}
                    disabled={gamblingLoading}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
                      ${gamblingSettings.gambling_mode_enabled 
                        ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                        : 'bg-gray-300 dark:bg-slate-600'
                      }
                      ${gamblingLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out
                        ${gamblingSettings.gambling_mode_enabled ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                    {gamblingLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      </div>
                    )}
                  </button>
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
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                      {gamblingSuccess}
                    </p>
                  </div>
                )}

                {/* 错误消息 */}
                {gamblingError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {gamblingError}
                      </p>
                      <button 
                        onClick={() => setGamblingError(null)}
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
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-chinese border border-red-200 dark:border-red-800"
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
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <User className="text-gray-400 dark:text-slate-500" size={24} />
              </div>
              <p className="text-gray-600 dark:text-slate-400 font-chinese">
                {tr('未找到用户信息', 'User info not found')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
