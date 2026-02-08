import { toError } from '../errorMessage';

/**
 * Normalizes unknown throw values into Error instances.
 * Keeps log/error handling call sites type-safe without unsafe casts.
 */
export function normalizeUnknownError(
  error: unknown,
  fallbackMessage: string = 'Unknown error',
): Error {
  const normalized = toError(error);
  return normalized.message.trim() ? normalized : new Error(fallbackMessage);
}
