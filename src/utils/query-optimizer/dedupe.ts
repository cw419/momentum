import { performanceLogger } from '../performanceLogger';
import { getCachedData, setCachedData, type CacheMap } from './cache';

export type PendingQueriesMap = Map<string, Promise<unknown>>;

export async function deduplicateQuery<T>(args: {
  key: string;
  queryFn: () => Promise<T>;
  cache: CacheMap;
  pendingQueries: PendingQueriesMap;
  cacheTtlMs: number;
  dependencies: string[];
}): Promise<T> {
  const { key, queryFn, cache, pendingQueries, cacheTtlMs, dependencies } = args;

  if (pendingQueries.has(key)) {
    return pendingQueries.get(key) as Promise<T>;
  }

  const cached = getCachedData<T>(cache, cacheTtlMs, key);
  if (cached !== null) {
    performanceLogger.debug(`[QUERY_OPTIMIZER] Cache hit for: ${key}`);
    return cached;
  }

  performanceLogger.debug(`[QUERY_OPTIMIZER] Executing fresh query: ${key}`);

  const promise = queryFn().finally(() => {
    pendingQueries.delete(key);
  });

  pendingQueries.set(key, promise);

  const result = await promise;
  setCachedData(cache, key, result, dependencies);
  return result;
}

