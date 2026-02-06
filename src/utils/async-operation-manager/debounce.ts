import { executeOnce } from './dedupe';

export function debounceOperation<T>(args: {
  debounceTimers: Map<string, NodeJS.Timeout>;
  pendingOperations: Map<string, Promise<unknown>>;
  key: string;
  operation: () => Promise<T>;
  delay?: number;
}): Promise<T> {
  const { debounceTimers, pendingOperations, key, operation, delay = 300 } = args;

  return new Promise((resolve, reject) => {
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        const result = await executeOnce(pendingOperations, key, operation);
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        debounceTimers.delete(key);
      }
    }, delay);

    debounceTimers.set(key, timer);
  });
}

