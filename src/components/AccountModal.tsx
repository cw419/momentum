import React, { useCallback, useEffect, useState } from 'react';
import { User, AlertCircle } from 'lucide-react';
import type { AuthUser } from '../domain/auth';
import type { GamblingSettings } from '../domain/userSettings';
import { useStorage } from '../storage/useStorage';
import { useI18n } from '../i18n';
import { logger } from '../utils/logger';
import { getSafeErrorDetail, getSafeErrorDetailFromUnknown } from '../utils/errorMessage';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { AccountModalHeader } from './account-modal/AccountModalHeader';
import { AccountModalLanguageSection } from './account-modal/AccountModalLanguageSection';
import { AccountModalUserContent } from './account-modal/AccountModalUserContent';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const storage = useStorage();
  const { language, locale, setLanguage, t, tr } = useI18n();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);
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

  const userFullName = (() => {
    const fullName = user?.userMetadata?.['full_name'];
    return typeof fullName === 'string' ? fullName : null;
  })();

  const loadUser = useCallback(async () => {
    if (storage.kind !== 'supabase') return;
    setLoading(true);
    setError(null);
    try {
      const result = await storage.getCurrentUser();
      if (!result.ok) {
        setUser(null);
        const safeDetail = getSafeErrorDetail(result.error.message || '', language);
        setError(
          safeDetail ??
            tr(
              '获取用户信息失败，请重试（详情见控制台）',
              'Failed to load user info. Check the console for details, then try again.'
            )
        );
        return;
      }

      setUser(result.value);
    } catch (err) {
      logger.error('ACCOUNT', 'Failed to get user info', undefined, err as Error);
      setError(tr('获取用户信息失败', 'Failed to load user info'));
    } finally {
      setLoading(false);
    }
  }, [storage, language, tr]);

  // 加载狂赌模式设置
  const loadGamblingSettings = useCallback(async () => {
    if (storage.kind !== 'supabase') return;
    try {
      setGamblingError(null);
      const settingsResult = await storage.getGamblingSettings();
      if (!settingsResult.ok) {
        const safeDetail = getSafeErrorDetail(settingsResult.error.message || '', language);
        setGamblingError(
          safeDetail ??
            tr(
              '获取设置失败，请重试（详情见控制台）',
              'Failed to load settings. Check the console for details, then try again.'
            )
        );
        return;
      }
      setGamblingSettings(settingsResult.value);
    } catch (err) {
      logger.error('ACCOUNT', 'Failed to load gambling settings', undefined, err as Error);
      setGamblingError(tr('获取设置失败', 'Failed to load settings'));
    }
  }, [storage, language, tr]);

  useEffect(() => {
    if (isOpen) {
      if (storage.kind !== 'supabase') {
        setUser(null);
        setLoading(false);
        return;
      }

      void loadUser();
      void loadGamblingSettings();
    }
  }, [isOpen, storage.kind, loadUser, loadGamblingSettings]);

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
      const safeDetail = getSafeErrorDetailFromUnknown(err, language);
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

  let accountContent: React.ReactNode;

  if (storage.kind !== 'supabase') {
    accountContent = (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <User className="text-gray-400 dark:text-slate-500" size={24} />
        </div>
        <p className="text-gray-600 dark:text-slate-400 font-chinese">
          {tr('当前使用本地存储模式，无需账号登录', 'Using local storage — no account required.')}
        </p>
      </div>
    );
  } else if (loading) {
    accountContent = (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 dark:text-slate-400 font-chinese">
          {tr('正在获取账号信息...', 'Loading account...')}
        </p>
      </div>
    );
  } else if (error) {
    accountContent = (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="text-red-500 dark:text-red-400" size={24} />
        </div>
        <p className="text-red-600 dark:text-red-400 font-chinese mb-4">{error}</p>
        <button
          type="button"
          onClick={loadUser}
          aria-label={tr('重试加载用户信息', 'Retry loading user info')}
          className="text-primary-500 hover:text-primary-600 font-medium transition-colors font-chinese"
        >
          {tr('重试', 'Retry')}
        </button>
      </div>
    );
  } else if (user) {
    accountContent = (
      <AccountModalUserContent
        user={user}
        userFullName={userFullName}
        locale={locale}
        tr={tr}
        gamblingSettings={gamblingSettings}
        gamblingLoading={gamblingLoading}
        gamblingError={gamblingError}
        gamblingSuccess={gamblingSuccess}
        signingOut={signingOut}
        onToggleGambling={() => void handleGamblingToggle()}
        onDismissGamblingError={() => setGamblingError(null)}
        onSignOut={() => void handleSignOut()}
      />
    );
  } else {
    accountContent = (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <User className="text-gray-400 dark:text-slate-500" size={24} />
        </div>
        <p className="text-gray-600 dark:text-slate-400 font-chinese">
          {tr('未找到用户信息', 'User info not found')}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md"
        style={{ overscrollBehavior: 'contain' }}
      >
        <AccountModalHeader title={t('settings.title')} closeLabel={tr('关闭', 'Close')} onClose={onClose} />

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Language */}
          <AccountModalLanguageSection language={language} setLanguage={setLanguage} t={t} />

          {accountContent}
        </div>
      </div>
    </div>
  );
};
