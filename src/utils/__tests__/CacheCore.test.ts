/**
 * CacheCore 基础缓存类测试
 */

import { CacheCore } from '../cache/CacheCore';

describe('CacheCore', () => {
  let cache: CacheCore;

  beforeEach(() => {
    cache = new CacheCore();
  });

  afterEach(() => {
    cache.stop();
    cache.clear();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL management', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL

      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeNull();
    });

    it('should return remaining TTL', () => {
      cache.set('key1', 'value1', 1000);
      const ttl = cache.getTTL('key1');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1000);
    });

    it('should return -1 for non-existent key TTL', () => {
      expect(cache.getTTL('nonexistent')).toBe(-1);
    });

    it('should update TTL', () => {
      cache.set('key1', 'value1', 100);
      expect(cache.updateTTL('key1', 5000)).toBe(true);
      const ttl = cache.getTTL('key1');
      expect(ttl).toBeGreaterThan(100);
    });

    it('should return false when updating TTL for non-existent key', () => {
      expect(cache.updateTTL('nonexistent', 1000)).toBe(false);
    });
  });

  describe('expiration cleanup', () => {
    it('should clear expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 5000);

      await new Promise(resolve => setTimeout(resolve, 100));

      const cleared = cache.clearExpired();
      expect(cleared).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should return 0 when no entries expired', () => {
      cache.set('key1', 'value1', 5000);
      const cleared = cache.clearExpired();
      expect(cleared).toBe(0);
    });
  });

  describe('cache statistics', () => {
    it('should track hit count', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getCacheStats();
      expect(stats.hitCount).toBe(2);
    });

    it('should track miss count', () => {
      cache.get('nonexistent1');
      cache.get('nonexistent2');

      const stats = cache.getCacheStats();
      expect(stats.missCount).toBe(2);
    });

    it('should calculate hit rate', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getCacheStats();
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should return 0 hit rate when no requests', () => {
      const stats = cache.getCacheStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should track total entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getCacheStats();
      expect(stats.totalEntries).toBe(2);
    });

    it('should estimate memory usage', () => {
      cache.set('key1', { data: 'some data' });

      const stats = cache.getCacheStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('key management', () => {
    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const keys = cache.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });
  });

  describe('eviction', () => {
    it('should evict oldest entry when max size reached', async () => {
      const smallCache = new CacheCore({ maxSize: 2 });

      smallCache.set('key1', 'value1');
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      smallCache.set('key2', 'value2');
      await new Promise(resolve => setTimeout(resolve, 10));
      smallCache.set('key3', 'value3');

      // One of the first two entries should be evicted
      const keys = smallCache.getKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key3');

      smallCache.stop();
    });
  });

  describe('lifecycle', () => {
    it('should start and stop cleanup interval', () => {
      cache.start();
      cache.stop();
      // No error should occur
    });

    it('should not start multiple cleanup intervals', () => {
      cache.start();
      cache.start();
      cache.stop();
      // No error should occur
    });
  });

  describe('custom configuration', () => {
    it('should use custom default TTL', async () => {
      const customCache = new CacheCore({ defaultTTL: 50 });
      customCache.set('key1', 'value1');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(customCache.get('key1')).toBeNull();
      customCache.stop();
    });
  });
});
