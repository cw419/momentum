import { logger } from './logger';

type FireAndForgetOptions = {
  label?: string;
  onError?: (error: unknown) => void;
};

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function fireAndForget(
  promise: PromiseLike<unknown> | void,
  options?: FireAndForgetOptions,
): void {
  Promise.resolve(promise).catch((error) => {
    options?.onError?.(error);
    logger.warn(
      'ASYNC',
      'Unhandled async error',
      options?.label ? { label: options.label } : undefined,
      toError(error),
    );
  });
}
