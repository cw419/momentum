/**
 * 例外规则缓存管理器
 *
 * 此文件已重构，实际实现已移至 cache/ 目录：
 * - CacheCore: 通用缓存基础类
 * - ExceptionRuleCache: 规则特定缓存功能
 */

export {
  ExceptionRuleCache,
  exceptionRuleCache
} from './cache/ExceptionRuleCache';

export { CacheCore } from './cache/CacheCore';

export type {
  CacheEntry,
  CacheStats,
  CacheConfig
} from './cache/CacheTypes';
