import { logger } from '../../../utils/logger';
import { isDev } from '../../../utils/env';
import { formatSupabaseError, getSupabaseErrorCode } from './supabaseError';
import type { User } from '@supabase/supabase-js';

const NON_RETRYABLE_ERROR_CODES = new Set(['PGRST204', 'PGRST116', '42703', '42P01']);
const NON_RETRYABLE_ERROR_MESSAGES = [
  'converting circular structure to json',
  'do not know how to serialize a bigint',
];

interface ErrorWithSupabaseMetadata extends Error {
  code?: string;
}

function toErrorWithMetadata(error: unknown): ErrorWithSupabaseMetadata {
  if (error instanceof Error) return error;

  const wrapped: ErrorWithSupabaseMetadata = new Error(formatSupabaseError(error, String(error)));
  const code = getSupabaseErrorCode(error);
  if (code) wrapped.code = code;
  return wrapped;

  // unreachable
}

function isNonRetryableMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return NON_RETRYABLE_ERROR_MESSAGES.some((fragment) => normalizedMessage.includes(fragment));
}

function isNonRetryableCode(error: unknown): boolean {
  const errorCode = getSupabaseErrorCode(error);
  return Boolean(errorCode) && NON_RETRYABLE_ERROR_CODES.has(errorCode as string);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAuthRelatedMessage(message: string): boolean {
  return (
    message.includes('violates row-level security policy') ||
    message.includes('RLS') ||
    message.includes('authentication') ||
    message.includes('auth')
  );
}

async function ensureAuthenticatedForRetry(
  deps: {
    isUserAuthenticated(): Promise<boolean>;
    waitForAuthentication(maxWaitTime?: number): Promise<{ user: User | null; isAuthenticated: boolean }>;
  },
  attempt: number
): Promise<void> {
  const isAuth = await deps.isUserAuthenticated();
  if (isAuth || attempt === 0) return;

  const { user, isAuthenticated } = await deps.waitForAuthentication(5000);
  if (!isAuthenticated || !user) {
    throw new Error('Authentication failed after waiting');
  }
}

function logAuthAwareRetryAttempt(details: {
  delay: number;
  attempt: number;
  maxRetries: number;
  error: string;
  isAuthError: boolean;
}): void {
  if (!isDev) return;
  logger.warn('SUPABASE_STORAGE', 'Auth-aware retry', details);
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = toErrorWithMetadata(error);

      if (isNonRetryableMessage(lastError.message)) {
        throw lastError;
      }

      if (isNonRetryableCode(error)) {
        throw lastError;
      }

      if (attempt === maxRetries) {
        logger.error('SUPABASE_STORAGE', 'Database operation failed after retries', {
          maxRetries,
          error: lastError.message,
        });
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      if (isDev) {
        logger.warn('SUPABASE_STORAGE', 'Operation failed; retrying', {
          delay,
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
        });
      }
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Retry operation failed');
}

export async function retryWithAuth<T>(
  deps: {
    isUserAuthenticated(): Promise<boolean>;
    waitForAuthentication(maxWaitTime?: number): Promise<{ user: User | null; isAuthenticated: boolean }>;
  },
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await ensureAuthenticatedForRetry(deps, attempt);

      return await operation();
    } catch (error) {
      lastError = toErrorWithMetadata(error);

      if (isNonRetryableMessage(lastError.message)) {
        throw lastError;
      }

      const isAuthError = isAuthRelatedMessage(lastError.message);

      if (!isAuthError && isNonRetryableCode(error)) throw lastError;

      if (attempt === maxRetries) {
        logger.error('SUPABASE_STORAGE', 'Database operation failed after retries with auth', {
          maxRetries,
          error: lastError.message,
          isAuthError,
        });
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logAuthAwareRetryAttempt({
        delay,
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message,
        isAuthError,
      });

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Retry with auth failed');
}
