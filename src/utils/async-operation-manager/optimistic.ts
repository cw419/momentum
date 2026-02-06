import type { AsyncOperation, OptimisticUpdate } from './types';

export async function optimisticUpdate<T>(args: {
  update: OptimisticUpdate<T>;
  pendingOperations: Map<string, Promise<unknown>>;
  executeOperation: (operation: AsyncOperation<T>) => Promise<T>;
}): Promise<T> {
  const { update, pendingOperations, executeOperation } = args;

  update.updateUI(update.optimisticValue);

  try {
    if (pendingOperations.has(update.id)) {
      return pendingOperations.get(update.id) as Promise<T>;
    }

    const promise = executeOperation({
      id: update.id,
      operation: update.operation,
      timeout: update.timeout,
      retryCount: update.retryCount,
    });

    pendingOperations.set(update.id, promise);

    const result = await promise;

    update.updateUI(result);
    return result;
  } catch (error) {
    update.rollback();
    throw error;
  } finally {
    pendingOperations.delete(update.id);
  }
}

export async function batchOptimisticUpdate<T>(args: {
  updates: OptimisticUpdate<T>[];
  executeOperation: (operation: AsyncOperation<T>) => Promise<T>;
}): Promise<T[]> {
  const { updates, executeOperation } = args;

  updates.forEach((update) => {
    update.updateUI(update.optimisticValue);
  });

  const promises = updates.map(async (update) => {
    try {
      const result = await executeOperation({
        id: update.id,
        operation: update.operation,
        timeout: update.timeout,
        retryCount: update.retryCount,
      });

      update.updateUI(result);
      return result;
    } catch (error) {
      update.rollback();
      throw error;
    }
  });

  return Promise.all(promises);
}

