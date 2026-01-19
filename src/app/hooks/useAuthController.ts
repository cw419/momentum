import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';

interface UseAuthControllerParams {
  storage: MomentumStorage;
  resetAppState: () => AppState;
  setState: Dispatch<SetStateAction<AppState>>;
}

interface AuthControllerResult {
  authUserId: string | null;
  isAuthReady: boolean;
}

/**
 * Manages authentication state for Supabase storage.
 * Listens for auth state changes and resets app state when user changes.
 */
export function useAuthController({
  storage,
  resetAppState,
  setState,
}: UseAuthControllerParams): AuthControllerResult {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const prevAuthUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (storage.kind !== 'supabase') {
      setAuthUserId(null);
      prevAuthUserIdRef.current = null;
      return;
    }

    const unsubscribeResult = storage.onAuthStateChange((event, session) => {
      const nextUserId = session.user?.id ?? null;
      setAuthUserId(nextUserId);

      const prevUserId = prevAuthUserIdRef.current;
      if (prevUserId !== nextUserId) {
        prevAuthUserIdRef.current = nextUserId;
        logger.debug('AUTH_CONTROLLER', 'Auth user changed', {
          event,
          prevUserId,
          nextUserId,
        });
        setState(resetAppState());
      }
    });

    if (!unsubscribeResult.ok) {
      logger.warn(
        'AUTH_CONTROLLER',
        'Failed to subscribe to auth state changes',
        { message: unsubscribeResult.error.message },
        toError(unsubscribeResult.error)
      );
      return;
    }

    return () => unsubscribeResult.value();
  }, [storage, resetAppState, setState]);

  const isAuthReady = storage.kind !== 'supabase' || Boolean(authUserId);

  return {
    authUserId,
    isAuthReady,
  };
}
