/**
 * 缓存系统集成测试
 * 测试缓存失效、会话生命周期等场景
 */

import { ExceptionRuleCache } from '../../utils/cache/ExceptionRuleCache';
import { CacheCore } from '../../utils/cache/CacheCore';
import { ExceptionRule, ExceptionRuleType } from '../../types';

describe('Cache System Integration', () => {
  describe('Cache Invalidation Scenarios', () => {
    let cache: ExceptionRuleCache;
    let mockRules: ExceptionRule[];

    beforeEach(() => {
      cache = new ExceptionRuleCache();
      mockRules = [
        {
          id: '1',
          name: '上厕所',
          chainId: 'chain1',
          scope: 'chain',
          type: ExceptionRuleType.PAUSE_ONLY,
          createdAt: new Date(),
          usageCount: 5,
          isActive: true
        },
        {
          id: '2',
          name: '喝水',
          chainId: 'chain1',
          scope: 'chain',
          type: ExceptionRuleType.PAUSE_ONLY,
          createdAt: new Date(),
          usageCount: 3,
          isActive: true
        }
      ];
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should invalidate related caches when rule is updated', () => {
      // Setup initial cache state
      cache.setChainRules('chain1', mockRules);
      cache.setRule(mockRules[0]);
      cache.setSearchResults('test', mockRules);
      cache.setStats('chain1', { total: 2 });

      // Verify initial state
      expect(cache.getChainRules('chain1')).not.toBeNull();
      expect(cache.getRule('1')).not.toBeNull();
      expect(cache.getSearchResults('test')).not.toBeNull();
      expect(cache.getStats('chain1')).not.toBeNull();

      // Invalidate related caches
      cache.invalidateRelated('1');

      // Rule-specific cache should be invalidated
      expect(cache.getRule('1')).toBeNull();
      // Search cache should be invalidated
      expect(cache.getSearchResults('test')).toBeNull();
      // Stats cache should be invalidated
      expect(cache.getStats('chain1')).toBeNull();
    });

    it('should invalidate search cache independently', () => {
      cache.setSearchResults('query1', mockRules);
      cache.setSearchResults('query2', mockRules);
      cache.setChainRules('chain1', mockRules);

      cache.invalidateSearchCache();

      expect(cache.getSearchResults('query1')).toBeNull();
      expect(cache.getSearchResults('query2')).toBeNull();
      // Chain rules should remain
      expect(cache.getChainRules('chain1')).not.toBeNull();
    });

    it('should handle chain-specific cache clearing', () => {
      cache.setChainRules('chain1', mockRules);
      cache.setChainSearchResults('chain1', 'test', mockRules);
      cache.setChainRules('chain2', []);

      cache.clearChainCache('chain1');

      expect(cache.getChainRules('chain1')).toBeNull();
      expect(cache.getChainSearchResults('chain1', 'test')).toBeNull();
      // Other chain should remain
      expect(cache.getChainRules('chain2')).not.toBeNull();
    });
  });

  describe('Session Lifecycle', () => {
    let cache: ExceptionRuleCache;

    beforeEach(() => {
      cache = new ExceptionRuleCache();
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should maintain cache across multiple operations', () => {
      const rule: ExceptionRule = {
        id: '1',
        name: '测试规则',
        chainId: 'chain1',
        scope: 'chain',
        type: ExceptionRuleType.PAUSE_ONLY,
        createdAt: new Date(),
        usageCount: 0,
        isActive: true
      };

      // Simulate session operations
      cache.setChainRules('chain1', [rule]);
      cache.setRule(rule);

      // Add more rules
      const newRule: ExceptionRule = { ...rule, id: '2', name: '新规则' };
      cache.addRuleToChain('chain1', newRule);

      // Verify state
      const rules = cache.getChainRules('chain1');
      expect(rules).toHaveLength(2);
    });

    it('should properly cleanup on destroy', () => {
      cache.setChainRules('chain1', []);
      cache.start();

      const subscriber = vi.fn();
      cache.subscribe(subscriber);

      cache.destroy();

      // After destroy, cache should be empty
      expect(cache.getChainRules('chain1')).toBeNull();
    });

    it('should notify subscribers during session', () => {
      const subscriber = vi.fn();
      cache.subscribe(subscriber);

      const rule: ExceptionRule = {
        id: '1',
        name: '测试',
        chainId: 'chain1',
        scope: 'chain',
        type: ExceptionRuleType.PAUSE_ONLY,
        createdAt: new Date(),
        usageCount: 0,
        isActive: true
      };

      cache.setChainRules('chain1', [rule]);
      cache.updateChainRules('chain1', [rule, { ...rule, id: '2' }]);

      expect(subscriber).toHaveBeenCalledTimes(2);
    });
  });

  describe('CacheCore and ExceptionRuleCache Integration', () => {
    it('should inherit CacheCore functionality', () => {
      const cache = new ExceptionRuleCache();

      // Test inherited methods
      cache.set('custom_key', { data: 'test' });
      expect(cache.get('custom_key')).toEqual({ data: 'test' });

      cache.delete('custom_key');
      expect(cache.get('custom_key')).toBeNull();

      cache.destroy();
    });

    it('should track statistics across all operations', () => {
      const cache = new ExceptionRuleCache();

      // Perform various operations
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      cache.getChainRules('chain1'); // miss

      const stats = cache.getCacheStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(2);

      cache.destroy();
    });
  });
});
