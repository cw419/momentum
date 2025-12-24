import React, { useState, useEffect } from 'react';
import type { AuthUser } from '../domain/auth';
import { useStorage } from '../storage/StorageContext';
import { logger } from '../utils/logger';
import { AuthForm } from './AuthForm';
import { IntroScreen } from './IntroScreen';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { tr } = useI18n();
  const storage = useStorage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'intro' | 'auth'>('intro');
  const [initialIsSignUp, setInitialIsSignUp] = useState(false);

  useEffect(() => {
    if (storage.kind !== 'supabase') {
      setUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const unsubscribeResult = storage.onAuthStateChange((event, session) => {
      logger.debug('AUTH', 'Auth state changed', { event, hasUser: Boolean(session.user) });
      setUser(session.user);
      setLoading(false);
    });

    const init = async () => {
      const authResult = await storage.waitForAuthentication(3000);
      if (!isMounted) return;

      if (!authResult.ok) {
        logger.warn('AUTH', 'waitForAuthentication failed', {
          code: authResult.error.code,
          message: authResult.error.message,
        });
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(authResult.value.user);
      setLoading(false);
    };

    init();

    return () => {
      isMounted = false;
      if (unsubscribeResult.ok) {
        unsubscribeResult.value();
      }
    };
  }, [storage]);

  if (storage.kind !== 'supabase') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
          <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
            {tr('正在验证身份…', 'Authenticating…')}
          </h2>
          <p className="text-gray-600 dark:text-slate-400 font-mono text-sm">
            {tr('验证中', 'AUTHENTICATING')}
          </p>
        </div>
      </div>
    );
  }



  if (!user) {
    if (view === 'intro') {
      return (
        <IntroScreen
          onSignIn={() => {
            setInitialIsSignUp(false);
            setView('auth');
          }}
          onSignUp={() => {
            setInitialIsSignUp(true);
            setView('auth');
          }}
        />
      );
    }
    return (
      <AuthForm
        initialIsSignUp={initialIsSignUp}
        onBack={() => setView('intro')}
      />
    );
  }

  return <>{children}</>;
};
