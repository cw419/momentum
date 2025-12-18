import React, { useEffect, useState } from 'react';
import type { AuthUser } from '../domain/auth';
import { useStorage } from '../storage/StorageContext';
import { logger } from '../utils/logger';
import { AuthForm } from './AuthForm';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const storage = useStorage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (storage.kind !== 'supabase') {
      setUser(null);
      setIsCheckingAuth(false);
      return;
    }

    let isMounted = true;
    setIsCheckingAuth(true);

    const unsubscribeResult = storage.onAuthStateChange((event, session) => {
      logger.debug('AUTH', 'Auth state changed', { event, hasUser: Boolean(session.user) });
      if (!isMounted) return;
      setUser(session.user);
      setIsCheckingAuth(false);
    });

    // Don't block first paint on auth readiness. If auth is slow to initialize,
    // show the AuthForm immediately and let onAuthStateChange update UI later.
    const revealTimeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      setIsCheckingAuth(false);
    }, 200);

    return () => {
      isMounted = false;
      window.clearTimeout(revealTimeoutId);
      if (unsubscribeResult.ok) {
        unsubscribeResult.value();
      }
    };
  }, [storage]);

  if (storage.kind !== 'supabase') {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <>
        <AuthForm />
        {isCheckingAuth && (
          <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-mono text-gray-700 shadow-sm backdrop-blur dark:bg-slate-900/70 dark:text-slate-200">
            <Loader2 className="animate-spin" size={14} />
            <span>AUTH CHECK</span>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};
