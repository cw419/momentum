import type { AsyncOperation } from './types';

export async function processQueue(args: {
  operationQueue: AsyncOperation<unknown>[];
  maxConcurrent: number;
  getIsProcessing: () => boolean;
  setIsProcessing: (value: boolean) => void;
  executeOperation: (operation: AsyncOperation<unknown>) => Promise<unknown>;
}): Promise<void> {
  const { operationQueue, maxConcurrent, getIsProcessing, setIsProcessing, executeOperation } = args;

  if (getIsProcessing() || operationQueue.length === 0) {
    return;
  }

  setIsProcessing(true);

  try {
    while (operationQueue.length > 0) {
      const batch = operationQueue.splice(0, maxConcurrent);
      await Promise.allSettled(batch.map((operation) => executeOperation(operation)));
    }
  } finally {
    setIsProcessing(false);
  }
}

