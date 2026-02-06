import type { AsyncOperation, OperationState } from './types';
import { executeWithTimeout } from './timeout';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWithRetry<T>(args: {
  operation: AsyncOperation<T>;
  operations: Map<string, OperationState>;
  defaultRetryCount: number;
  defaultTimeout: number;
}): Promise<T> {
  const { operation, operations, defaultRetryCount, defaultTimeout } = args;

  const maxRetries = operation.retryCount ?? defaultRetryCount;
  const timeout = operation.timeout ?? defaultTimeout;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const operationState = operations.get(operation.id);
      if (operationState) {
        operationState.attempts = attempt + 1;
      }

      return await executeWithTimeout(operation.operation, timeout);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        operation.onRetry?.(attempt + 1);

        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await delay(backoffDelay);
      }
    }
  }

  throw lastError!;
}

