export async function executeOnce<T>(
  pendingOperations: Map<string, Promise<unknown>>,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (pendingOperations.has(key)) {
    return pendingOperations.get(key) as Promise<T>;
  }

  const promise = operation();
  pendingOperations.set(key, promise);

  try {
    return await promise;
  } finally {
    pendingOperations.delete(key);
  }
}
