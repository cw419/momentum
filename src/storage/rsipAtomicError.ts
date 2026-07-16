export class RSIPAtomicIntentError extends Error {
  readonly isOutcomeAmbiguous: boolean;
  readonly code?: string;

  constructor(
    message: string,
    options: {
      isOutcomeAmbiguous: boolean;
      code?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'RSIPAtomicIntentError';
    this.isOutcomeAmbiguous = options.isOutcomeAmbiguous;
    this.code = options.code;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isAmbiguousRSIPAtomicIntentError(
  error: unknown,
): error is RSIPAtomicIntentError {
  return (
    error instanceof RSIPAtomicIntentError && error.isOutcomeAmbiguous === true
  );
}
