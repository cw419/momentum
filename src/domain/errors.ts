type AppErrorCode =
  | 'NOT_SUPPORTED'
  | 'NOT_CONFIGURED'
  | 'NOT_AUTHENTICATED'
  | 'VALIDATION'
  | 'NETWORK'
  | 'STORAGE'
  | 'UNKNOWN';

export interface AppError {
  code: AppErrorCode;
  message: string;
  cause?: unknown;
}

export function toAppError(error: unknown, fallbackMessage: string = 'Unknown error'): AppError {
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message || fallbackMessage, cause: error };
  }
  if (typeof error === 'string') {
    return { code: 'UNKNOWN', message: error || fallbackMessage, cause: error };
  }
  return { code: 'UNKNOWN', message: fallbackMessage, cause: error };
}

