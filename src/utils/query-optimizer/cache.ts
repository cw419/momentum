import type { CacheEntry } from './types';

export type CacheMap = Map<string, CacheEntry<unknown>>;

export function getCachedData<T>(
  cache: CacheMap,
  cacheTtlMs: number,
  key: string,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > cacheTtlMs) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCachedData<T>(
  cache: CacheMap,
  key: string,
  data: T,
  dependencies?: string[],
): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    dependencies,
  });
}

export function invalidateCache(cache: CacheMap, dependency: string): void {
  for (const [key, entry] of cache.entries()) {
    if (entry.dependencies?.includes(dependency)) {
      cache.delete(key);
    }
  }
}
