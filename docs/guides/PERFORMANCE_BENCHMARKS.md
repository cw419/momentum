# Performance Benchmarks

This document defines performance targets, monitoring tools, and optimization guidelines for Momentum.

## Table of Contents

1. [Key Operation Performance Targets](#1-key-operation-performance-targets)
2. [Existing Performance Monitoring Tools](#2-existing-performance-monitoring-tools)
3. [Performance Testing Methods](#3-performance-testing-methods)
4. [Performance Optimization Checklist](#4-performance-optimization-checklist)
5. [Monitoring and Alerting](#5-monitoring-and-alerting)

---

## 1. Key Operation Performance Targets

### 1.1 Rule Operations

| Operation | Target Latency | Max Latency | Notes |
|-----------|---------------|-------------|-------|
| Rule Creation | 50ms | 100ms | Single rule creation |
| Rule Validation | 10ms | 50ms | Input validation and constraint checking |
| Rule Search | 100ms | 200ms | Full-text search across 200+ rules |
| Rule Filtering by Type | 100ms | 200ms | Filter by `PAUSE_ONLY` or `EARLY_COMPLETION_ONLY` |

### 1.2 Data Loading Operations

| Operation | Target Latency | Max Latency | Notes |
|-----------|---------------|-------------|-------|
| Chain Retrieval | 100ms | 200ms | Fetch all active chains |
| Chain Creation | 50ms | 100ms | Create single chain |
| Chain Update | 75ms | 150ms | Update chain properties |
| Chain Deletion (soft) | 50ms | 100ms | Move to recycle bin |
| Batch Load (all data) | 300ms | 500ms | Parallel load of chains, sessions, history |
| Bulk Insert (1000 chains) | 1000ms | 2000ms | Stress test threshold |

### 1.3 Component Rendering

| Operation | Target Latency | Max Latency | Notes |
|-----------|---------------|-------------|-------|
| Component Render | 16.67ms | 100ms | 60 FPS threshold |
| Chain Tree Build | 5ms | 10ms | Build hierarchical tree from chains |
| UI Interaction Response | 100ms | 200ms | User-triggered actions |

### 1.4 Core Web Vitals Targets

| Metric | Target | Maximum | Description |
|--------|--------|---------|-------------|
| FPS | 60 | min 30 | Frames per second |
| CLS | 0.1 | 0.25 | Cumulative Layout Shift |
| Memory Usage | 20MB | 50MB | JS Heap Size |
| Cache Hit Rate | 70% | min 50% | Query cache effectiveness |

---

## 2. Existing Performance Monitoring Tools

### 2.1 performanceMonitor.ts

**Location:** `src/utils/performanceMonitor.ts`

A comprehensive performance monitoring class that tracks rendering, interactions, layout shifts, and FPS.

#### Core Features

- **FPS Monitoring:** Tracks frames per second, warns when below 30 FPS
- **Layout Shift Detection:** Monitors Cumulative Layout Shift (CLS) via PerformanceObserver
- **Paint Performance:** Tracks First Contentful Paint (FCP)
- **Custom Measurements:** Records component render times and interaction durations
- **Memory Tracking:** Reports JS heap size usage

#### Usage

```typescript
import { performanceMonitor, usePerformanceMonitoring } from '@/utils/performanceMonitor';

// Direct API usage
performanceMonitor.startMonitoring();
performanceMonitor.stopMonitoring();

// Measure render time
const result = performanceMonitor.measureRender('MyComponent', () => {
  return expensiveOperation();
});

// Measure interaction time
performanceMonitor.measureInteraction('buttonClick', () => {
  handleClick();
});

// Get performance report
const report = performanceMonitor.reportMetrics();
// Returns: { renderTime, interactionTime, layoutShifts, fps, memoryUsage }

// Check if performance is acceptable
const { passed, issues } = performanceMonitor.checkPerformance();
```

#### React Hook Usage

```typescript
function MyComponent() {
  const { measureRender, measureInteraction, reportMetrics } =
    usePerformanceMonitoring('MyComponent');

  const handleClick = () => {
    measureInteraction('click', () => {
      // interaction logic
    });
  };

  return measureRender(() => (
    <div onClick={handleClick}>Content</div>
  ));
}
```

#### Configuration

```typescript
// Enable/disable background mode (batch processing)
performanceMonitor.setBackgroundMode(true);

// Enable/disable reporting (dev-only by default)
performanceMonitor.setReportingEnabled(true);
```

---

### 2.2 performanceLogger.ts

**Location:** `src/utils/performanceLogger.ts`

A performance-aware logging utility that eliminates console output in production while providing detailed debugging in development.

#### Core Features

- **Environment-Aware:** Logs only in development mode (except errors)
- **Timing Functions:** Built-in timing utilities for measuring operations
- **Grouped Logging:** Organize related logs together
- **Unified Logger Integration:** Uses the central `logger` utility

#### Usage

```typescript
import { performanceLogger } from '@/utils/performanceLogger';

// Basic logging (dev only)
performanceLogger.log('Operation completed', { details });
performanceLogger.warn('Slow operation detected');
performanceLogger.debug('Debug info', data);

// Errors are always logged
performanceLogger.error('Critical failure', error);

// Time a synchronous operation
const result = performanceLogger.time('expensiveOperation', () => {
  return doExpensiveWork();
});

// Time and log performance
performanceLogger.perf('renderComponent', () => {
  render();
});

// Group related logs
performanceLogger.group('Component Lifecycle', () => {
  performanceLogger.log('Mount started');
  performanceLogger.log('Mount completed');
});

// Trace function calls
performanceLogger.trace('functionName', arg1, arg2);
```

---

### 2.3 LayoutStabilityMonitor.ts

**Location:** `src/utils/LayoutStabilityMonitor.ts`

Monitors and automatically fixes layout stability issues including horizontal overflow and layout shifts.

#### Core Features

- **Layout Shift Monitoring:** Tracks CLS via PerformanceObserver
- **DOM Mutation Monitoring:** Watches for dynamic content changes
- **Resize Monitoring:** Tracks element size changes
- **Auto-Fix Capability:** Automatically applies fixes for common issues
- **Stability Reports:** Generates detailed stability analysis

#### Issue Types Detected

| Issue Type | Severity | Description |
|------------|----------|-------------|
| `horizontal-overflow` | Medium/High | Element content overflows horizontally |
| `layout-shift` | Medium/High | Unexpected layout shifts detected |
| `unstable-width` | Low | Elements with potentially unstable widths |

#### Usage

```typescript
import { layoutStabilityMonitor, useLayoutStability } from '@/utils/LayoutStabilityMonitor';

// Direct API usage
layoutStabilityMonitor.startMonitoring(containerElement);
layoutStabilityMonitor.stopMonitoring();

// Manual check
layoutStabilityMonitor.checkNow(containerElement);

// Get stability report
const report = layoutStabilityMonitor.getStabilityReport();
// Returns: {
//   cumulativeLayoutShift: number,
//   totalIssues: number,
//   issuesByType: Record<string, number>,
//   issuesBySeverity: Record<string, number>,
//   recommendations: string[]
// }

// Preventive stabilization
layoutStabilityMonitor.stabilizeLayout(containerElement);

// Register callback for stabilization completion
const unsubscribe = layoutStabilityMonitor.onStabilized(() => {
  console.log('Layout stabilized');
});
```

#### React Hook Usage

```typescript
function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { startMonitoring, stopMonitoring, getReport } =
    useLayoutStability(containerRef);

  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  return <div ref={containerRef}>Content</div>;
}
```

#### Constructor Options

```typescript
// Disable auto-fix
const monitor = new LayoutStabilityMonitor(false);
```

---

### 2.4 performanceDashboard.ts

**Location:** `src/utils/performanceDashboard.ts`

Dashboard for monitoring query optimization and cache performance metrics.

#### Core Features

- **Cache Hit/Miss Tracking:** Records cache effectiveness
- **Metrics History:** Stores up to 50 historical snapshots
- **Auto-Capture:** Periodic metrics collection (configurable interval)
- **Query Optimizer Integration:** Works with `queryOptimizer.ts`

#### Usage

```typescript
import { performanceDashboard } from '@/utils/performanceDashboard';

// Start auto-capture (default: every 30 seconds)
performanceDashboard.start(30000);

// Stop auto-capture
performanceDashboard.stop();

// Record cache events
performanceDashboard.recordCacheHit();
performanceDashboard.recordCacheMiss();

// Get hit rate
const hitRate = performanceDashboard.getHitRate(); // Returns percentage

// Manual capture
performanceDashboard.captureMetrics();

// Get full report
const report = performanceDashboard.getPerformanceReport();
// Returns: {
//   cacheSize: number,
//   pendingQueries: number,
//   hitRate: number,
//   totalHits: number,
//   totalMisses: number,
//   metricsHistory: Array<{ timestamp, cacheSize, pendingQueries, hitRate }>
// }

// Console output
performanceDashboard.displayConsoleReport();

// Reset all metrics
performanceDashboard.reset();
```

---

### 2.5 reactPerformanceMonitor.ts

**Location:** `src/utils/reactPerformanceMonitor.ts`

Tracks React-specific performance metrics including render times and tree builds.

#### Usage

```typescript
import { reactPerformanceMonitor, usePerformanceMonitor } from '@/utils/reactPerformanceMonitor';

// Track render time
reactPerformanceMonitor.trackRender('ComponentName', renderTimeMs);

// Track tree build time
reactPerformanceMonitor.trackTreeBuild(buildTimeMs);

// Track cache events
reactPerformanceMonitor.trackCacheHit();
reactPerformanceMonitor.trackCacheMiss();

// Get statistics
const stats = reactPerformanceMonitor.getStats();
// Returns: {
//   avgRenderTime, maxRenderTime,
//   avgTreeBuildTime, maxTreeBuildTime,
//   totalRenders, totalTreeBuilds,
//   cacheHitRate, cacheHits, cacheMisses
// }

// Generate console report with recommendations
const report = reactPerformanceMonitor.generateReport();

// Reset metrics
reactPerformanceMonitor.reset();
```

#### React Hook

```typescript
function MyComponent() {
  const { trackRender } = usePerformanceMonitor('MyComponent');

  useEffect(() => {
    const startTime = performance.now();
    // render logic
    trackRender(performance.now() - startTime);
  });
}
```

---

### 2.6 queryOptimizer.ts

**Location:** `src/utils/queryOptimizer.ts`

Database query optimization with caching, deduplication, and batch operations.

#### Key Features

- **Query Deduplication:** Prevents duplicate concurrent queries
- **Intelligent Caching:** 30-second TTL with dependency-based invalidation
- **Batch Loading:** Parallel data loading for optimal performance
- **Memoized Tree Building:** Two-level caching for chain tree construction

#### Usage

```typescript
import { queryOptimizer, useOptimizedData } from '@/utils/queryOptimizer';

// Deduplicate queries
const result = await queryOptimizer.deduplicateQuery('chains:getActive', async () => {
  return storage.getActiveChains();
});

// Batch load all data
const { chains, scheduledSessions, activeSession, completionHistory } =
  await queryOptimizer.batchLoadData(storage);

// Memoized tree building
const tree = queryOptimizer.memoizedBuildChainTree(chains);

// Invalidate cache on data change
queryOptimizer.onDataChange('chains');

// Get cache stats
const stats = queryOptimizer.getCacheStats();

// Clear all caches
queryOptimizer.clearCache();

// Full performance report
queryOptimizer.generatePerformanceReport();
```

---

## 3. Performance Testing Methods

### 3.1 Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Watch mode for development
npm run test:performance:watch
```

### 3.2 Test Configuration

**File:** `vitest.performance.config.ts`

```typescript
{
  test: {
    setupFiles: ['./src/test/setup.performance.ts'],
    include: [
      'src/**/*.performance.test.{js,ts,jsx,tsx}',
      'src/**/__tests__/**/*.performance.{js,ts,jsx,tsx}'
    ],
    testTimeout: 120000,  // 2 minute timeout for long tests
    hookTimeout: 120000,
  }
}
```

### 3.3 Performance Test Utilities

**File:** `src/test/setup.performance.ts`

#### Benchmarks

```typescript
import { performanceUtils } from '@/test/setup.performance';

// Predefined thresholds
performanceUtils.BENCHMARKS.FAST_OPERATION;     // 10ms
performanceUtils.BENCHMARKS.MEDIUM_OPERATION;   // 100ms
performanceUtils.BENCHMARKS.SLOW_OPERATION;     // 1000ms
performanceUtils.BENCHMARKS.DATABASE_QUERY;     // 500ms
performanceUtils.BENCHMARKS.UI_INTERACTION;     // 16.67ms (60fps)
performanceUtils.BENCHMARKS.MEMORY_LIMIT;       // 50MB
```

#### Measurement Utilities

```typescript
// Measure async operation
const { result, duration } = await performanceUtils.measureAsyncOperation(
  () => fetchData()
);
expect(duration).toBeLessThan(performanceUtils.BENCHMARKS.DATABASE_QUERY);

// Measure sync operation
const { result, duration } = performanceUtils.measureSyncOperation(
  () => processData()
);
expect(duration).toBeLessThan(performanceUtils.BENCHMARKS.FAST_OPERATION);
```

#### Concurrent Operations

```typescript
// Test concurrent load
const results = await performanceUtils.runConcurrentOperations(
  () => apiCall(),
  concurrency: 10,  // 10 concurrent calls
  iterations: 5     // repeat 5 times
);
// Returns: { results, totalTime, averageTime, operationsPerSecond }
```

#### Memory Leak Detection

```typescript
const detector = performanceUtils.createMemoryLeakDetector();

// Run operations
detector.reset();
await performMemoryIntensiveWork();

// Check for leaks
const { growth, isLeaking, current, initial } = detector.check();
expect(isLeaking).toBe(false);
```

### 3.4 Adding New Performance Tests

Create a new file following the naming convention: `*.performance.test.ts`

```typescript
// src/__tests__/performance/MyFeature.performance.test.ts
import { describe, it, expect } from 'vitest';
import { performanceUtils } from '@/test/setup.performance';

describe('MyFeature Performance', () => {
  it('should complete operation within threshold', async () => {
    const { duration } = await performanceUtils.measureAsyncOperation(
      () => myFeature.doSomething()
    );

    expect(duration).toBeLessThan(performanceUtils.BENCHMARKS.MEDIUM_OPERATION);
  });

  it('should handle concurrent load', async () => {
    const result = await performanceUtils.runConcurrentOperations(
      () => myFeature.doSomething(),
      20,  // concurrency
      3    // iterations
    );

    expect(result.operationsPerSecond).toBeGreaterThan(10);
  });

  it('should not leak memory', async () => {
    const detector = performanceUtils.createMemoryLeakDetector();

    for (let i = 0; i < 100; i++) {
      await myFeature.createAndDestroy();
    }

    const { isLeaking } = detector.check();
    expect(isLeaking).toBe(false);
  });
});
```

---

## 4. Performance Optimization Checklist

### 4.1 Render Optimization

- [ ] **Use `React.memo` for pure components**
  - Wrap components that receive the same props frequently
  - Define custom comparison functions when needed

- [ ] **Use `useMemo` for expensive computations**
  ```typescript
  const expensiveResult = useMemo(
    () => computeExpensiveValue(a, b),
    [a, b]
  );
  ```

- [ ] **Use `useCallback` for callback stability**
  ```typescript
  const handleClick = useCallback(() => {
    doSomething(id);
  }, [id]);
  ```

- [ ] **Avoid inline object/array creation in JSX**
  ```typescript
  // Bad
  <Component style={{ margin: 10 }} />

  // Good
  const style = useMemo(() => ({ margin: 10 }), []);
  <Component style={style} />
  ```

- [ ] **Virtualize long lists**
  - Use virtualization libraries for lists with 100+ items
  - Implement windowing for infinite scroll

### 4.2 Data Loading Optimization

- [ ] **Use batch loading via `queryOptimizer.batchLoadData()`**
  - Load related data in parallel
  - Avoid waterfall requests

- [ ] **Implement query deduplication**
  ```typescript
  await queryOptimizer.deduplicateQuery(cacheKey, queryFn);
  ```

- [ ] **Use optimistic updates for mutations**
  - Update UI immediately, rollback on error

- [ ] **Implement pagination for large datasets**
  - Load data in chunks
  - Use cursor-based pagination for real-time data

- [ ] **Prefetch predictable data**
  - Load data before user navigation

### 4.3 Cache Optimization

- [ ] **Configure appropriate TTL values**
  - Default: 30 seconds for frequently changing data
  - Longer for static reference data

- [ ] **Implement cache invalidation on mutations**
  ```typescript
  queryOptimizer.onDataChange('chains');
  ```

- [ ] **Use memoized tree building**
  ```typescript
  queryOptimizer.memoizedBuildChainTree(chains);
  ```

- [ ] **Monitor cache hit rate**
  - Target: 70%+ hit rate
  - Investigate if below 50%

- [ ] **Clear stale cache appropriately**
  ```typescript
  queryOptimizer.clearCache();
  ```

### 4.4 Layout Stability

- [ ] **Set explicit dimensions for images and media**
  ```html
  <img width="300" height="200" />
  ```

- [ ] **Reserve space for dynamic content**
  ```css
  .container { min-height: 100px; }
  ```

- [ ] **Use CSS `contain` property**
  ```css
  .isolated { contain: layout style; }
  ```

- [ ] **Avoid layout thrashing**
  - Batch DOM reads before writes
  - Use `requestAnimationFrame` for animations

- [ ] **Monitor CLS with LayoutStabilityMonitor**

### 4.5 Memory Management

- [ ] **Clean up subscriptions and timers**
  ```typescript
  useEffect(() => {
    const timer = setInterval(...);
    return () => clearInterval(timer);
  }, []);
  ```

- [ ] **Avoid closure memory leaks**
  - Don't capture large objects in long-lived closures

- [ ] **Use WeakMap/WeakSet for caches when appropriate**

- [ ] **Run memory leak tests for new features**

---

## 5. Monitoring and Alerting

### 5.1 Performance Metrics Collection

#### Development Mode

Performance monitoring is automatically enabled in development:

```typescript
// In AppShellContainer.tsx
useEffect(() => {
  if (isDev) {
    performanceMonitor.start();
    performanceDashboard.start();
    return () => {
      performanceMonitor.stop();
      performanceDashboard.stop();
    };
  }
}, []);
```

#### Manual Reporting

Generate on-demand performance reports:

```typescript
// Full performance report
queryOptimizer.generatePerformanceReport();

// React metrics
reactPerformanceMonitor.generateReport();

// Performance check
const { passed, issues } = performanceMonitor.checkPerformance();
```

### 5.2 Performance Degradation Detection

#### Automated Detection Thresholds

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| FPS | < 30 | < 15 |
| Interaction Time | > 100ms | > 200ms |
| Layout Shift | > 0.1 | > 0.25 |
| Memory Usage | > 50MB | > 100MB |
| Render Time | > 16ms | > 100ms |
| Cache Hit Rate | < 70% | < 50% |

#### Regression Detection in Tests

```typescript
it('should detect performance regressions', async () => {
  const baselineMetrics = {
    chain_operations_per_second: 50,
    memory_usage_mb: 20,
    query_response_time_ms: 100
  };

  // Measure and compare with 20% tolerance
  const currentMetrics = await measureCurrentPerformance();

  for (const [metric, baseline] of Object.entries(baselineMetrics)) {
    const current = currentMetrics[metric];
    const threshold = baseline * 1.2;  // 20% degradation allowed
    expect(current).toBeLessThanOrEqual(threshold);
  }
});
```

### 5.3 Warning Outputs

Performance warnings are logged via `performanceLogger`:

```
[WARN] PERFORMANCE: Slow render detected in ChainCard: 25.43ms
[WARN] PERFORMANCE: Slow tree build: 12.5ms
[WARN] PERFORMANCE: Cache hit rate below 70% - consider optimizing cache strategy
[WARN] FPS is low: 28
[WARN] Large layout shift detected: 0.15
```

### 5.4 Recommended Monitoring Workflow

1. **During Development:**
   - Keep browser DevTools Performance tab open
   - Monitor console for performance warnings
   - Run `test:performance` before commits

2. **Before Release:**
   - Run full performance test suite
   - Check for regression against baselines
   - Review memory usage patterns

3. **In Production:**
   - Monitor Core Web Vitals via analytics
   - Track error rates for timeouts
   - Set up alerts for performance SLO breaches

---

## Appendix: Quick Reference

### Import Paths

```typescript
import { performanceMonitor, usePerformanceMonitoring } from '@/utils/performanceMonitor';
import { performanceLogger } from '@/utils/performanceLogger';
import { layoutStabilityMonitor, useLayoutStability } from '@/utils/LayoutStabilityMonitor';
import { performanceDashboard } from '@/utils/performanceDashboard';
import { reactPerformanceMonitor, usePerformanceMonitor } from '@/utils/reactPerformanceMonitor';
import { queryOptimizer, useOptimizedData } from '@/utils/queryOptimizer';
```

### Test Commands

```bash
npm run test:performance      # Run performance tests
npm run test:performance:watch  # Watch mode
npm run test:all              # Run all tests including performance
```

### Key Benchmark Values

| Category | Value | Unit |
|----------|-------|------|
| Fast Operation | 10 | ms |
| Medium Operation | 100 | ms |
| Slow Operation | 1000 | ms |
| Database Query | 500 | ms |
| UI Frame | 16.67 | ms |
| Memory Limit | 50 | MB |
