/**
 * 缓存相关常量
 */

export const CACHE_TTL = {
  /** 默认缓存时间 - 5分钟 */
  DEFAULT: 5 * 60 * 1000,
  /** 搜索结果缓存时间 - 2分钟 */
  SEARCH_RESULTS: 2 * 60 * 1000,
  /** 统计数据缓存时间 - 10分钟 */
  STATS: 10 * 60 * 1000,
  /** 重复检查缓存时间 - 2分钟 */
  DUPLICATION_CHECK: 2 * 60 * 1000,
  /** 清理间隔 - 1分钟 */
  CLEANUP_INTERVAL: 60 * 1000,
} as const;

export const CACHE_SIZE = {
  /** 最大缓存条目数 */
  MAX_ENTRIES: 1000,
  /** 搜索缓存最大条目数 */
  MAX_SEARCH_ENTRIES: 100,
  /** 历史记录最大条目数 */
  MAX_HISTORY_ENTRIES: 50,
} as const;
