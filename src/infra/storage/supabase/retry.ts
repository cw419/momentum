import { logger } from '../../../utils/logger';
import { isDev } from '../../../utils/env';
import { formatSupabaseError, getSupabaseErrorCode } from './supabaseError';
import type { User } from '@supabase/supabase-js';

const NON_RETRYABLE_ERROR_CODES = new Set(['PGRST204', 'PGRST116', '42703', '42P01']);
const NON_RETRYABLE_ERROR_MESSAGES = [
  'converting circular structure to json',
  'do not know how to serialize a bigint',
];
const AUTH_ERROR_MESSAGE_FRAGMENTS = [
  'violates row-level security policy',
  'rls',
  'authentication',
  'auth',
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

function isNonRetryableErrorMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return NON_RETRYABLE_ERROR_MESSAGES.some(fragment => normalizedMessage.includes(fragment));
}

function isAuthRelatedErrorMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return AUTH_ERROR_MESSAGE_FRAGMENTS.some(fragment => normalizedMessage.includes(fragment));
}

function isNonRetryableErrorCode(error: unknown): boolean {
  const errorCode = getSupabaseErrorCode(error);
  return !!(errorCode && NON_RETRYABLE_ERROR_CODES.has(errorCode));
}

function shouldAbortRetry(error: unknown, lastError: ErrorWithSupabaseMetadata): boolean {
  return isNonRetryableErrorMessage(lastError.message) || isNonRetryableErrorCode(error);
}

function shouldAbortRetryWithAuth(
  error: unknown,
  lastError: ErrorWithSupabaseMetadata
): { shouldAbort: boolean; isAuthError: boolean } {
  const isAuthError = isAuthRelatedErrorMessage(lastError.message);
  const shouldAbort = isNonRetryableErrorMessage(lastError.message) || (!isAuthError && isNonRetryableErrorCode(error));
  return { shouldAbort, isAuthError };
}

function getRetryDelayMs(baseDelay: number, attempt: number): number {
  return baseDelay * Math.pow(2, attempt);
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function maybeWaitForAuthentication(
  deps: {
    isUserAuthenticated(): Promise<boolean>;
    waitForAuthentication(maxWaitTime?: number): Promise<{ user: User | null; isAuthenticated: boolean }>;
  },
  attempt: number
): Promise<void> {
  const isAuthenticated = await deps.isUserAuthenticated();
  if (isAuthenticated || attempt === 0) return;

  const { user, isAuthenticated: isAuthAfterWait } = await deps.waitForAuthentication(5000);
  if (!isAuthAfterWait || !user) {
    throw new Error('Authentication failed after waiting');
  }
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

      if (shouldAbortRetry(error, lastError)) {
        throw lastError;
      }

      if (attempt === maxRetries) {
        logger.error('SUPABASE_STORAGE', 'Database operation failed after retries', {
          maxRetries,
          error: lastError.message,
        });
        throw lastError;
      }

      const delay = getRetryDelayMs(baseDelay, attempt);
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
      await maybeWaitForAuthentication(deps, attempt);

      return await operation();
    } catch (error) {
      lastError = toErrorWithMetadata(error);

      const decision = shouldAbortRetryWithAuth(error, lastError);
      if (decision.shouldAbort) {
        throw lastError;
      }

      if (attempt === maxRetries) {
        logger.error('SUPABASE_STORAGE', 'Database operation failed after retries with auth', {
          maxRetries,
          error: lastError.message,
          isAuthError: decision.isAuthError,
        });
        throw lastError;
      }

      const delay = getRetryDelayMs(baseDelay, attempt);
      if (isDev) {
        logger.warn('SUPABASE_STORAGE', 'Auth-aware retry', {
          delay,
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
          isAuthError: decision.isAuthError,
        });
      }

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Retry with auth failed');
}
