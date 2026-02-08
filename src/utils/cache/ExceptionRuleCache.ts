/**
 * 例外规则缓存管理器
 * 继承 CacheCore 提供规则特定的缓存功能
 */

import { ExceptionRule, ExceptionRuleType, RuleUsageRecord } from '../../types';
import { logger } from '../logger';
import { toError } from '../errorMessage';
import { CACHE_TTL } from '../../constants/cache';
import { CacheCore } from './CacheCore';

export class ExceptionRuleCache extends CacheCore {
  private subscribers = new Set<
    (chainId: string, rules: ExceptionRule[]) => void
  >();

  constructor() {
    super();
  }

  private getNamespacePrefix(namespace: string): string {
    return `__ns__${namespace}__`;
  }

  private getNamespacedKey(namespace: string, key: string): string {
    return `${this.getNamespacePrefix(namespace)}${key}`;
  }

  getNamespaced<T>(namespace: string, key: string): T | null {
    return this.get<T>(this.getNamespacedKey(namespace, key));
  }

  setNamespaced<T>(
    namespace: string,
    key: string,
    data: T,
    ttl?: number,
  ): void {
    this.set(this.getNamespacedKey(namespace, key), data, ttl);
  }

  invalidateNamespace(namespace: string): void {
    const prefix = this.getNamespacePrefix(namespace);
    this.invalidateByPattern((key) => key.startsWith(prefix));
  }

  getChainRules(chainId: string): ExceptionRule[] | null {
    return this.get<ExceptionRule[]>(`chain_rules_${chainId}`);
  }

  setChainRules(chainId: string, rules: ExceptionRule[], ttl?: number): void {
    const chainSpecificRules = rules.filter(
      (rule) => rule.chainId === chainId && rule.scope === 'chain',
    );
    this.set(`chain_rules_${chainId}`, chainSpecificRules, ttl);
    this.notifySubscribers(chainId, chainSpecificRules);
  }

  getRule(ruleId: string): ExceptionRule | null {
    return this.get<ExceptionRule>(`rule_${ruleId}`);
  }

  setRule(rule: ExceptionRule, ttl?: number): void {
    this.set(`rule_${rule.id}`, rule, ttl);
  }

  getUsageRecords(key: string): RuleUsageRecord[] | null {
    return this.get<RuleUsageRecord[]>(`usage_${key}`);
  }

  setUsageRecords(records: RuleUsageRecord[], key: string, ttl?: number): void {
    this.set(`usage_${key}`, records, ttl);
  }

  getSearchResults(
    query: string,
    actionType?: ExceptionRuleType,
  ): ExceptionRule[] | null {
    const key = `search_${query}_${actionType || 'all'}`;
    return this.get<ExceptionRule[]>(key);
  }

  setSearchResults(
    query: string,
    results: ExceptionRule[],
    actionType?: ExceptionRuleType,
    ttl?: number,
  ): void {
    const key = `search_${query}_${actionType || 'all'}`;
    this.set(key, results, ttl || CACHE_TTL.SEARCH_RESULTS);
  }

  getStats<T = unknown>(key: string): T | null {
    return this.get<T>(`stats_${key}`);
  }

  setStats<T>(key: string, stats: T, ttl?: number): void {
    this.set(`stats_${key}`, stats, ttl || CACHE_TTL.STATS);
  }

  preloadRuleDetails(rules: ExceptionRule[]): void {
    for (const rule of rules) {
      this.setRule(rule);
    }
  }

  invalidateRelated(ruleId: string): void {
    this.invalidateByPattern(
      (key) =>
        key.includes(ruleId) ||
        key.startsWith('all_rules') ||
        key.startsWith('search_') ||
        key.startsWith('stats_'),
    );
  }

  invalidateSearchCache(): void {
    this.invalidateByPattern((key) => key.startsWith('search_'));
  }

  subscribe(
    callback: (chainId: string, rules: ExceptionRule[]) => void,
  ): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(chainId: string, rules: ExceptionRule[]): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(chainId, rules);
      } catch (error) {
        logger.error(
          'EXCEPTION_RULE_CACHE',
          'Subscriber notification failed',
          undefined,
          toError(error),
        );
      }
    });
  }

  updateChainRules(chainId: string, rules: ExceptionRule[]): void {
    this.setChainRules(chainId, rules);
    this.invalidateChainSearchCache(chainId);
  }

  addRuleToChain(chainId: string, rule: ExceptionRule): void {
    const existingRules = this.getChainRules(chainId) || [];

    if (rule.chainId !== chainId || rule.scope !== 'chain') {
      logger.warn(
        'EXCEPTION_RULE_CACHE',
        'Attempting to add non-chain-specific rule to chain cache',
        {
          chainId,
          ruleId: rule.id,
          ruleChainId: rule.chainId,
          ruleScope: rule.scope,
        },
      );
      return;
    }

    const updatedRules = [...existingRules, rule];
    this.setChainRules(chainId, updatedRules);
  }

  removeRuleFromChain(chainId: string, ruleId: string): void {
    const existingRules = this.getChainRules(chainId) || [];
    const updatedRules = existingRules.filter((rule) => rule.id !== ruleId);
    this.setChainRules(chainId, updatedRules);
  }

  updateRuleInChain(chainId: string, updatedRule: ExceptionRule): void {
    const existingRules = this.getChainRules(chainId) || [];
    const ruleIndex = existingRules.findIndex(
      (rule) => rule.id === updatedRule.id,
    );

    if (ruleIndex !== -1) {
      existingRules[ruleIndex] = updatedRule;
      this.setChainRules(chainId, existingRules);
    }
  }

  clearChainCache(chainId: string): void {
    this.invalidateByPattern((key) => key.includes(chainId));
  }

  private invalidateChainSearchCache(chainId: string): void {
    this.invalidateByPattern(
      (key) => key.startsWith('search_') && key.includes(chainId),
    );
  }

  getChainSearchResults(
    chainId: string,
    query: string,
    actionType?: ExceptionRuleType,
  ): ExceptionRule[] | null {
    const key = `search_${chainId}_${query}_${actionType || 'all'}`;
    return this.get<ExceptionRule[]>(key);
  }

  setChainSearchResults(
    chainId: string,
    query: string,
    results: ExceptionRule[],
    actionType?: ExceptionRuleType,
    ttl?: number,
  ): void {
    const key = `search_${chainId}_${query}_${actionType || 'all'}`;
    const chainSpecificResults = results.filter(
      (rule) => rule.chainId === chainId && rule.scope === 'chain',
    );
    this.set(key, chainSpecificResults, ttl || CACHE_TTL.SEARCH_RESULTS);
  }

  async preloadChainData(
    chainId: string,
    loadFunction: (chainId: string) => Promise<ExceptionRule[]>,
  ): Promise<void> {
    try {
      if (this.getChainRules(chainId)) {
        return;
      }
      const rules = await loadFunction(chainId);
      this.setChainRules(chainId, rules);
      for (const rule of rules) {
        this.setRule(rule);
      }
    } catch (error) {
      logger.warn(
        'EXCEPTION_RULE_CACHE',
        `预加载链 ${chainId} 数据失败`,
        undefined,
        toError(error),
      );
    }
  }

  getChainCacheStats(chainId: string): {
    rulesCount: number;
    cacheHit: boolean;
    lastUpdated: number | null;
  } {
    const cacheKey = `chain_rules_${chainId}`;
    const entry = this.cache.get(cacheKey);
    const data = entry?.data;
    const rulesCount = Array.isArray(data) ? data.length : 0;

    return {
      rulesCount,
      cacheHit: !!entry,
      lastUpdated: entry?.timestamp || null,
    };
  }

  destroy(): void {
    this.stopCleanupInterval();
    this.clear();
    this.subscribers.clear();
  }
}

export const exceptionRuleCache = new ExceptionRuleCache();
