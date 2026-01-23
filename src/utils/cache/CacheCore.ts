/**
 * 通用缓存核心类
 * 提供基础的缓存操作功能
 */

import { CacheEntry, CacheStats, CacheConfig } from './CacheTypes';
import { CACHE_TTL, CACHE_SIZE } from '../../constants/cache';

export class CacheCore {
  protected cache: Map<string, CacheEntry<unknown>> = new Map();
  protected hitCount = 0;
  protected missCount = 0;
  protected readonly config: CacheConfig;
  protected cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: config?.defaultTTL ?? CACHE_TTL.DEFAULT,
      maxSize: config?.maxSize ?? CACHE_SIZE.MAX_ENTRIES,
      cleanupInterval: config?.cleanupInterval ?? CACHE_TTL.CLEANUP_INTERVAL,
    };
  }

  start(): void {
    this.startCleanupInterval();
  }

  stop(): void {
    this.stopCleanupInterval();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTTL
    };

    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  clearExpired(): number {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  getTTL(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return -1;

    const remaining = entry.timestamp + entry.ttl - Date.now();
    return Math.max(0, remaining);
  }

  updateTTL(key: string, newTTL: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.ttl = newTTL;
    entry.timestamp = Date.now();
    return true;
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  getCacheStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      memoryUsage += this.estimateSize(entry.data);
    }

    return {
      totalEntries: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage
    };
  }

  protected invalidateByPattern(predicate: (key: string) => boolean): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(predicate);
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  protected evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  protected startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      this.clearExpired();
    }, this.config.cleanupInterval);
  }

  protected stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  protected estimateSize(obj: unknown): number {
    const jsonString = JSON.stringify(obj);
    return jsonString.length * 2;
  }
}
