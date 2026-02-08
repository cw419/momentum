import React, { useCallback, useEffect, useState } from 'react';
import { User, AlertCircle } from 'lucide-react';
import type { AuthUser } from '../domain/auth';
import type { GamblingSettings } from '../domain/userSettings';
import { useStorage } from '../storage/useStorage';
import { useI18n } from '../i18n';
import { logger } from '../utils/logger';
import {
  getSafeErrorDetail,
  getSafeErrorDetailFromUnknown,
} from '../utils/errorMessage';
import { normalizeUnknownError } from '../utils/errors/normalizeError';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { AccountModalHeader } from './account-modal/AccountModalHeader';
import { AccountModalLanguageSection } from './account-modal/AccountModalLanguageSection';
import { AccountModalUserContent } from './account-modal/AccountModalUserContent';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
}) => {
  const storage = useStorage();
  const { language, locale, setLanguage, t, tr } = useI18n();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 鐙傝祵妯″紡鐩稿叧鐘舵€?
  const [gamblingSettings, setGamblingSettings] = useState<GamblingSettings>({
    gambling_mode_enabled: false,
    daily_bet_limit: null,
    max_single_bet: null,
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
        const safeDetail = getSafeErrorDetail(
          result.error.message || '',
          language,
        );
        setError(
          safeDetail ??
            tr(
              '鑾峰彇鐢ㄦ埛淇℃伅澶辫触锛岃閲嶈瘯锛堣鎯呰鎺у埗鍙帮級',
              'Failed to load user info. Check the console for details, then try again.',
            ),
        );
        return;
      }

      setUser(result.value);
    } catch (err) {
      logger.error(
        'ACCOUNT',
        'Failed to get user info',
        undefined,
        normalizeUnknownError(err),
      );
      setError(tr('鑾峰彇鐢ㄦ埛淇℃伅澶辫触', 'Failed to load user info'));
    } finally {
      setLoading(false);
    }
  }, [storage, language, tr]);

  // 鍔犺浇鐙傝祵妯″紡璁剧疆
  const loadGamblingSettings = useCallback(async () => {
    if (storage.kind !== 'supabase') return;
    try {
      setGamblingError(null);
      const settingsResult = await storage.getGamblingSettings();
      if (!settingsResult.ok) {
        const safeDetail = getSafeErrorDetail(
          settingsResult.error.message || '',
          language,
        );
        setGamblingError(
          safeDetail ??
            tr(
              '鑾峰彇璁剧疆澶辫触锛岃閲嶈瘯锛堣鎯呰鎺у埗鍙帮級',
              'Failed to load settings. Check the console for details, then try again.',
            ),
        );
        return;
      }
      setGamblingSettings(settingsResult.value);
    } catch (err) {
      logger.error(
        'ACCOUNT',
        'Failed to load gambling settings',
        undefined,
        normalizeUnknownError(err),
      );
      setGamblingError(tr('鑾峰彇璁剧疆澶辫触', 'Failed to load settings'));
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

  // 鍒囨崲鐙傝祵妯″紡
  const handleGamblingToggle = async () => {
    if (storage.kind !== 'supabase') return;
    setGamblingLoading(true);
    setGamblingError(null);
    setGamblingSuccess(null);

    try {
      const nextEnabled = !gamblingSettings.gambling_mode_enabled;
      const result = await storage.toggleGamblingMode();

      if (!result.ok) {
        const safeDetail = getSafeErrorDetail(
          result.error.message || '',
          language,
        );
        setGamblingError(
          safeDetail ??
            tr(
              '璁剧疆鏇存柊澶辫触锛岃閲嶈瘯锛堣鎯呰鎺у埗鍙帮級',
              'Failed to update settings. Check the console for details, then try again.',
            ),
        );
        return;
      }

      if (result.value.success) {
        setGamblingSettings((prev) => ({
          ...prev,
          gambling_mode_enabled: !prev.gambling_mode_enabled,
        }));
        setGamblingSuccess(
          nextEnabled
            ? tr('Gambling mode enabled', 'Gambling mode enabled')
            : tr('Gambling mode disabled', 'Gambling mode disabled'),
        );

        // 3绉掑悗娓呴櫎鎴愬姛娑堟伅
        setTimeout(() => setGamblingSuccess(null), 3000);
      } else {
        const safeDetail = getSafeErrorDetail(
          result.value.message || '',
          language,
        );
        setGamblingError(
          safeDetail ??
            tr(
              '璁剧疆鏇存柊澶辫触锛岃閲嶈瘯锛堣鎯呰鎺у埗鍙帮級',
              'Failed to update settings. Check the console for details, then try again.',
            ),
        );
      }
    } catch (err) {
      logger.error(
        'ACCOUNT',
        'Failed to toggle gambling mode',
        undefined,
        normalizeUnknownError(err),
      );
      const safeDetail = getSafeErrorDetailFromUnknown(err, language);
      setGamblingError(
        safeDetail ??
          tr(
            '璁剧疆鏇存柊澶辫触锛岃閲嶈瘯锛堣鎯呰鎺у埗鍙帮級',
            'Failed to update settings. Check the console for details, then try again.',
          ),
      );
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
        const safeDetail = getSafeErrorDetail(
          result.error.message || '',
          language,
        );
        setError(
          safeDetail ??
            tr(
              'Sign out failed. Check the console for details, then try again.',
              'Sign out failed. Check the console for details, then try again.',
            ),
        );
        return;
      }

      onClose();
    } catch (err) {
      logger.error(
        'ACCOUNT',
        'Sign out failed',
        undefined,
        normalizeUnknownError(err),
      );
      setError(
        tr(
          'Sign out failed. Please try again.',
          'Sign out failed. Please try again.',
        ),
      );
    } finally {
      setSigningOut(false);
    }
  };

  if (!isOpen) return null;

  let accountContent: React.ReactNode;

  if (storage.kind !== 'supabase') {
    accountContent = (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-700">
          <User className="text-gray-400 dark:text-slate-500" size={24} />
        </div>
        <p className="font-chinese text-gray-600 dark:text-slate-400">
          {tr(
            '褰撳墠浣跨敤鏈湴瀛樺偍妯″紡锛屾棤闇€璐﹀彿鐧诲綍',
            'Using local storage 鈥?no account required.',
          )}
        </p>
      </div>
    );
  } else if (loading) {
    accountContent = (
      <div className="py-8 text-center">
        <div className="gradient-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
        </div>
        <p className="font-chinese text-gray-600 dark:text-slate-400">
          {tr('姝ｅ湪鑾峰彇璐﹀彿淇℃伅...', 'Loading account...')}
        </p>
      </div>
    );
  } else if (error) {
    accountContent = (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
          <AlertCircle className="text-red-500 dark:text-red-400" size={24} />
        </div>
        <p className="mb-4 font-chinese text-red-600 dark:text-red-400">
          {error}
        </p>
        <button
          type="button"
          onClick={loadUser}
          aria-label={tr('閲嶈瘯鍔犺浇鐢ㄦ埛淇℃伅', 'Retry loading user info')}
          className="font-chinese font-medium text-primary-500 transition-colors hover:text-primary-600"
        >
          {tr('閲嶈瘯', 'Retry')}
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
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-700">
          <User className="text-gray-400 dark:text-slate-500" size={24} />
        </div>
        <p className="font-chinese text-gray-600 dark:text-slate-400">
          {tr('User info not found', 'User info not found')}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        style={{ overscrollBehavior: 'contain' }}
      >
        <AccountModalHeader
          title={t('settings.title')}
          closeLabel={tr('鍏抽棴', 'Close')}
          onClose={onClose}
        />

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Language */}
          <AccountModalLanguageSection
            language={language}
            setLanguage={setLanguage}
            t={t}
          />

          {accountContent}
        </div>
      </div>
    </div>
  );
};
