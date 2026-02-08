# Caching Strategy Guide

This document describes the caching architecture used in Momentum, including cache types, TTL policies, invalidation strategies, and best practices.

---

## Table of Contents

1. [Cache Hierarchy Overview](#cache-hierarchy-overview)
2. [Memory Caches](#memory-caches)
   - [ExceptionRuleCache](#exceptionrulecache)
   - [EnhancedRuleValidationService Cache](#enhancedrulevalidationservice-cache)
   - [EnhancedDuplicationHandler Cache](#enhancedduplicationhandler-cache)
   - [QueryOptimizer Cache](#queryoptimizer-cache)
   - [RuleStateManager Cache](#rulestatemanager-cache)
3. [Local Storage Cache](#local-storage-cache)
4. [Request-Level Cache](#request-level-cache)
5. [Cache Consistency Guarantees](#cache-consistency-guarantees)
6. [Best Practices](#best-practices)
7. [Performance Metrics](#performance-metrics)
8. [Debugging Cache Issues](#debugging-cache-issues)

---

## Cache Hierarchy Overview

Momentum uses a three-tier caching strategy to optimize performance:

```
+---------------------------+
|     Request-Level Cache   |  <-- Shortest TTL (in-flight deduplication)
+---------------------------+
            |
            v
+---------------------------+
|      Memory Cache         |  <-- Medium TTL (2-10 minutes)
+---------------------------+
            |
            v
+---------------------------+
|   Local Storage Cache     |  <-- Longest TTL (persistent)
+---------------------------+
            |
            v
+---------------------------+
|   Backend (Supabase)      |  <-- Source of truth
+---------------------------+
```

| Cache Layer   | Location                        | TTL            | Purpose                           |
| ------------- | ------------------------------- | -------------- | --------------------------------- |
| Request-Level | `queryOptimizer.pendingQueries` | In-flight only | Deduplicate concurrent queries    |
| Memory Cache  | Various service caches          | 2-10 minutes   | Fast access, reduce API calls     |
| Local Storage | `localStorage`                  | Persistent     | Offline support, session recovery |

---

## Memory Caches

### ExceptionRuleCache

**File:** `src/utils/exceptionRuleCache.ts`

The primary cache for exception rules, providing chain-specific rule caching and subscription-based updates.

#### Configuration

| Parameter        | Value                  | Description                            |
| ---------------- | ---------------------- | -------------------------------------- |
| `DEFAULT_TTL`    | 5 minutes (300,000 ms) | Default time-to-live for cache entries |
| `MAX_CACHE_SIZE` | 1,000 entries          | Maximum number of cache entries        |
| Cleanup Interval | 1 minute               | Periodic expired entry cleanup         |

#### Cache Key Patterns

| Key Pattern                   | Data Type           | TTL    | Description             |
| ----------------------------- | ------------------- | ------ | ----------------------- |
| `chain_rules_{chainId}`       | `ExceptionRule[]`   | 5 min  | Chain-specific rules    |
| `rule_{ruleId}`               | `ExceptionRule`     | 5 min  | Individual rule details |
| `usage_{key}`                 | `RuleUsageRecord[]` | 5 min  | Usage records           |
| `search_{query}_{actionType}` | `ExceptionRule[]`   | 2 min  | Search results          |
| `stats_{key}`                 | varies              | 10 min | Statistics data         |

#### Invalidation Triggers

```typescript
// 1. Rule modification - invalidate related caches
exceptionRuleCache.invalidateRelated(ruleId);

// 2. Search cache - invalidate all search results
exceptionRuleCache.invalidateSearchCache();

// 3. Chain-specific - clear all cache for a chain
exceptionRuleCache.clearChainCache(chainId);

// 4. Full clear - clear all cached data
exceptionRuleCache.clear();
```

#### Subscription Pattern

```typescript
// Subscribe to cache updates
const unsubscribe = exceptionRuleCache.subscribe((chainId, rules) => {
  console.log(`Rules updated for chain: ${chainId}`);
});

// Unsubscribe when done
unsubscribe();
```

#### Lifecycle Management

```typescript
// Start cache (in AppShellContainer.tsx)
exceptionRuleCache.start();

// Stop cache on cleanup
exceptionRuleCache.stop();
```

---

### EnhancedRuleValidationService Cache

**File:** `src/services/EnhancedRuleValidationService.ts`

Caches rule validation results to avoid redundant validation operations.

#### Configuration

| Parameter   | Value                  | Description           |
| ----------- | ---------------------- | --------------------- |
| `CACHE_TTL` | 5 minutes (300,000 ms) | Validation result TTL |

#### Cache Key Pattern

```
{ruleId}_{actionType}
```

Example: `rule_123_pause`

#### Invalidation

```typescript
// Clear all validation cache
enhancedRuleValidationService.clearValidationCache();

// Cleanup expired entries only
enhancedRuleValidationService.cleanupExpiredCache();
```

#### Use Case

```typescript
// Cached validation - fast path for repeated checks
const result = await enhancedRuleValidationService.preValidateRuleUsage(
  ruleId,
  actionType,
);
```

---

### EnhancedDuplicationHandler Cache

**File:** `src/services/EnhancedDuplicationHandler.ts`

Caches duplication check results for rule name validation.

#### Configuration

| Parameter   | Value                  | Description                  |
| ----------- | ---------------------- | ---------------------------- |
| `CACHE_TTL` | 2 minutes (120,000 ms) | Shorter TTL for real-time UX |

#### Cache Key Pattern

```
{name}_{excludeId || 'new'}
```

Example: `Emergency Call_rule_456`

#### Invalidation

```typescript
// Clear after rule creation/modification
enhancedDuplicationHandler.clearCache();

// Cleanup expired entries
enhancedDuplicationHandler.cleanupExpiredCache();
```

---

### QueryOptimizer Cache

**File:** `src/utils/queryOptimizer.ts`

General-purpose query cache for database operations and chain tree building.

#### Configuration

| Parameter   | Value      | Description                    |
| ----------- | ---------- | ------------------------------ |
| `CACHE_TTL` | 30 seconds | Shorter TTL for data freshness |

#### Special Features

1. **Query Deduplication**: Prevents duplicate in-flight queries

   ```typescript
   // Multiple calls to the same query return the same promise
   const data = await queryOptimizer.deduplicateQuery('chains:getActive', () =>
     storage.getActiveChains(),
   );
   ```

2. **Memoized Chain Tree Building**: Revision-first caching (hash fallback)

   ```typescript
   // Prefer passing a monotonic `revision` (e.g. `AppState.chainsRevision`) to avoid hashing.
   const tree = queryOptimizer.memoizedBuildChainTree(chains, chainsRevision);
   ```

3. **Batch Data Loading**: Parallel query execution

   ```typescript
   const { chains, scheduledSessions, activeSession, completionHistory } =
     await queryOptimizer.batchLoadData(storage);
   ```

#### Invalidation

```typescript
// Invalidate by data type
queryOptimizer.onDataChange('chains');
queryOptimizer.onDataChange('sessions');
queryOptimizer.onDataChange('history');

// Full cache clear
queryOptimizer.clearCache();
```

---

### RuleStateManager Cache

**File:** `src/services/RuleStateManager.ts`

Manages rule state for optimistic updates and temporary ID mapping.

#### Configuration

| Parameter        | Value      | Description                     |
| ---------------- | ---------- | ------------------------------- |
| State TTL        | 10 minutes | Expired state cleanup threshold |
| Cleanup Interval | 5 minutes  | Periodic cleanup frequency      |

#### Cached Data

| Data Type          | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `states`           | Rule status tracking (`active`, `creating`, `error`, etc.) |
| `pendingCreations` | In-progress rule creation promises                         |
| `idMappings`       | Temporary ID to real ID mappings                           |

#### Lifecycle

```typescript
// Start periodic cleanup (in AppShellContainer.tsx)
ruleStateManager.start();

// Stop cleanup
ruleStateManager.stop();

// Manual cleanup
ruleStateManager.cleanupExpiredStates();
```

---

## Local Storage Cache

**File:** `src/utils/localPreferences.ts`

Persistent cache for UI preferences and service state recovery.

### Storage Keys

| Key                           | Purpose                 | Data Type          |
| ----------------------------- | ----------------------- | ------------------ | -------- |
| `momentum_exception_rules`    | Exception rules backup  | JSON string        |
| `momentum_rule_usage_records` | Usage records           | JSON string        |
| `momentum_timer_{sessionId}`  | Timer state persistence | `TimerPersistData` |
| `momentum_auto_resume`        | Auto-resume data        | `AutoResumeData`   |
| `momentum:rsip-canvas-state`  | Canvas position/zoom    | `CanvasState`      |
| `theme`                       | UI theme preference     | `'light'`          | `'dark'` |
| `language`                    | Language preference     | `'en'`             | `'zh'`   |

### Timer State Cleanup

```typescript
// Clean up timer states older than 24 hours
localPreferences.cleanupExpiredTimers(24 * 60 * 60 * 1000);
```

---

## Request-Level Cache

Query deduplication ensures that concurrent identical requests share the same promise:

```typescript
// In queryOptimizer.ts
async deduplicateQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  // If query is already pending, return the same promise
  if (this.pendingQueries.has(key)) {
    return this.pendingQueries.get(key)!;
  }

  // Execute query and store promise
  const promise = queryFn().finally(() => {
    this.pendingQueries.delete(key);
  });

  this.pendingQueries.set(key, promise);
  return promise;
}
```

---

## Cache Consistency Guarantees

### Write-Through Updates

When data is modified, caches are updated or invalidated:

```typescript
// Example: After creating a rule
const rule = await exceptionRuleStorage.createRule(data);

// Invalidate related caches
exceptionRuleCache.invalidateRelated(rule.id);
enhancedDuplicationHandler.clearCache();
```

### Subscription-Based Notifications

The `ExceptionRuleCache` uses a pub/sub pattern for real-time updates:

```typescript
// Publisher
exceptionRuleCache.setChainRules(chainId, rules);
// Automatically notifies all subscribers

// Subscriber
exceptionRuleCache.subscribe((chainId, rules) => {
  // React to cache updates
});
```

### Cache Staleness Prevention

1. **TTL-based expiration**: All caches have finite TTL
2. **Periodic cleanup**: Background intervals remove expired entries
3. **Write invalidation**: Modifications invalidate affected caches
4. **Revision-first + hash fallback**: Chain tree prefers a monotonic revision number (when provided) and falls back to content hashing

---

## Best Practices

### When to Use Cache

| Scenario                | Recommended Cache                       | Reason                          |
| ----------------------- | --------------------------------------- | ------------------------------- |
| Repeated rule lookups   | `ExceptionRuleCache`                    | High hit rate for same chain    |
| Rule validation         | `EnhancedRuleValidationService`         | Expensive validation operations |
| Name duplication checks | `EnhancedDuplicationHandler`            | Real-time UX feedback           |
| Initial data load       | `QueryOptimizer.batchLoadData`          | Parallel query optimization     |
| Chain tree rendering    | `QueryOptimizer.memoizedBuildChainTree` | Expensive tree computation      |

### When to Bypass Cache

| Scenario               | Action                    | Reason               |
| ---------------------- | ------------------------- | -------------------- |
| After data mutation    | Call `invalidate*()`      | Ensure consistency   |
| User-initiated refresh | Call `clearCache()`       | Explicit user intent |
| Critical operations    | Query storage directly    | Guarantee freshness  |
| Debugging issues       | Disable cache temporarily | Isolate problems     |

### Cache Hygiene

```typescript
// DO: Invalidate after mutations
await exceptionRuleStorage.updateRule(ruleId, updates);
exceptionRuleCache.invalidateRelated(ruleId);

// DO: Use batch operations when possible
const data = await queryOptimizer.batchLoadData(storage);

// DON'T: Ignore cache cleanup on component unmount
useEffect(() => {
  return () => {
    // Cleanup subscriptions
    unsubscribe();
  };
}, []);

// DON'T: Cache user-specific data without user context
// Always scope cache keys appropriately
```

---

## Performance Metrics

### Target Metrics

| Metric              | Target | Measurement                                      |
| ------------------- | ------ | ------------------------------------------------ |
| Cache Hit Rate      | > 80%  | `exceptionRuleCache.getCacheStats().hitRate`     |
| Memory Usage        | < 5MB  | `exceptionRuleCache.getCacheStats().memoryUsage` |
| Query Deduplication | > 50%  | Compare `pendingQueries` to total requests       |

### Monitoring Cache Performance

```typescript
// Get cache statistics
const stats = exceptionRuleCache.getCacheStats();
console.log({
  totalEntries: stats.totalEntries,
  hitCount: stats.hitCount,
  missCount: stats.missCount,
  hitRate: stats.hitRate,
  memoryUsage: stats.memoryUsage,
});

// Get QueryOptimizer stats
const queryStats = queryOptimizer.getCacheStats();
console.log({
  cacheSize: queryStats.cacheSize,
  pendingQueries: queryStats.pendingQueries,
  cacheKeys: queryStats.cacheKeys,
});

// Performance dashboard (dev only)
import { performanceDashboard } from '../utils/performanceDashboard';
performanceDashboard.displayConsoleReport();
```

### Using Performance Dashboard

The performance dashboard provides comprehensive metrics in development mode:

```typescript
// Start monitoring (automatically done in AppShellContainer)
performanceDashboard.start(30000); // 30-second intervals

// Get report
const report = performanceDashboard.getPerformanceReport();
console.log({
  hitRate: report.hitRate,
  totalHits: report.totalHits,
  totalMisses: report.totalMisses,
  metricsHistory: report.metricsHistory,
});

// Display console report
performanceDashboard.displayConsoleReport();
```

---

## Debugging Cache Issues

### Common Issues and Solutions

| Issue                | Symptom             | Solution                                     |
| -------------------- | ------------------- | -------------------------------------------- |
| Stale data displayed | UI shows old values | Call `invalidateRelated()` or `clearCache()` |
| High memory usage    | Slow performance    | Check `MAX_CACHE_SIZE`, reduce TTL           |
| Low hit rate         | Frequent API calls  | Review cache key patterns, increase TTL      |
| Race conditions      | Inconsistent state  | Use query deduplication                      |

### Debug Commands

```typescript
// 1. Check cache contents
console.log(exceptionRuleCache.getKeys());

// 2. Check specific entry TTL
const remainingTTL = exceptionRuleCache.getTTL('chain_rules_abc123');
console.log(`TTL remaining: ${remainingTTL}ms`);

// 3. Check if entry exists
const exists = exceptionRuleCache.has('rule_xyz');

// 4. Force cache refresh
exceptionRuleCache.clear();
await loadData(); // Reload from storage

// 5. View RuleStateManager state (for optimistic updates)
const ruleStates = ruleStateManager.getAllStates();
console.log(ruleStates);
```

### Enabling Verbose Logging

Cache operations are logged using the project's logger utility:

```typescript
import { logger } from '../utils/logger';

// Enable debug logging to see cache operations
// (Configured via environment or logger settings)
```

---

## Summary

| Cache                | File                               | TTL        | Key Use Case        |
| -------------------- | ---------------------------------- | ---------- | ------------------- |
| `exceptionRuleCache` | `exceptionRuleCache.ts`            | 5 min      | Rule data caching   |
| `validationCache`    | `EnhancedRuleValidationService.ts` | 5 min      | Validation results  |
| `checkCache`         | `EnhancedDuplicationHandler.ts`    | 2 min      | Name duplication    |
| `queryOptimizer`     | `queryOptimizer.ts`                | 30 sec     | Query deduplication |
| `ruleStateManager`   | `RuleStateManager.ts`              | 10 min     | Optimistic updates  |
| `localPreferences`   | `localPreferences.ts`              | Persistent | UI state recovery   |

---

## Related Documentation

| Document                                   | Description                    |
| ------------------------------------------ | ------------------------------ |
| [ARCHITECTURE.md](./ARCHITECTURE.md)       | System architecture overview   |
| [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) | Debugging strategies           |
| `src/utils/performanceDashboard.ts`        | Performance monitoring         |
| `src/utils/performanceMonitor.ts`          | Component performance tracking |
