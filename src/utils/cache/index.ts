/**
 * Cache module entrypoint.
 * CacheCore is the shared abstraction; specialized caches are adapters.
 */

export { CacheCore } from './CacheCore';
export type { CacheEntry, CacheStats, CacheConfig } from './CacheTypes';
export { ExceptionRuleCache, exceptionRuleCache } from './ExceptionRuleCache';
export { RuleSearchCache } from '../rule-search-optimizer/RuleSearchCache';
