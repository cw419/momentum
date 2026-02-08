# PM-003: 状态同步问题

**严重程度**: High
**影响版本**: new-feature-branch (before commits 0512678, de3f1d8)
**修复提交**: `0512678`, `de3f1d8`, `3117d86`

---

## 1. 概述

删除链条后，内存中的状态与数据库状态不同步，导致：

1. 回收箱数据不刷新
2. 新建链条保存失败（数据库冲突错误）
3. UI 显示与实际数据不一致

这是一类典型的"状态缓存与数据库不一致"问题。

## 2. 影响范围

### 用户可见症状

- 删除链条后，回收箱计数不更新
- 删除后立即创建新链条，保存失败
- 错误信息：`ON CONFLICT DO UPDATE command cannot affect row a second time`
- 需要刷新页面才能正常操作

### 影响面

- 频繁编辑链条的用户
- 用户体验断裂，被迫手动刷新

## 3. 根因分析

### 3.1 多层缓存架构

```
┌─────────────────┐
│   React State   │  ← setState 更新
├─────────────────┤
│  Domain Hooks   │  ← useChainsDomain 等
├─────────────────┤
│  Storage Layer  │  ← MomentumStorage 接口
├─────────────────┤
│ RealTimeSync    │  ← 缓存 + 订阅
├─────────────────┤
│ Query Optimizer │  ← 查询缓存
├─────────────────┤
│   Supabase DB   │  ← 真实数据源
└─────────────────┘
```

### 3.2 问题场景

```typescript
// 删除链条的流程（修复前）
async function deleteChain(chainId: string) {
  // 1. 更新 React state
  setState((prev) => ({
    ...prev,
    chains: prev.chains.filter((c) => c.id !== chainId),
  }));

  // 2. 写入数据库
  await storage.softDeleteChain(chainId);

  // ❌ 问题：以下缓存层都没有更新
  // - RealTimeSyncService 的内存缓存
  // - QueryOptimizer 的查询缓存
  // - RecycleBin 的状态
}
```

### 3.3 新建链条失败的原因

```sql
-- 当缓存中还有旧的链条数据时，safelySaveChains 会尝试 upsert
-- 如果同一批次中包含刚删除的链条和新链条，可能触发：
ON CONFLICT (id) DO UPDATE
-- 同一事务中对同一行的第二次更新会失败
```

### 3.4 时序问题

```
T1: 用户删除链条 A
    └── React state 更新 ✓
    └── DB 更新 ✓
    └── RealTimeSync 缓存未清除 ✗
    └── QueryOptimizer 缓存未清除 ✗

T2: 用户创建新链条 B
    └── safelySaveChains 被调用
    └── 从缓存读到过期数据（包含链条 A）
    └── 尝试 upsert 链条 A 和 B
    └── 💥 数据库冲突错误
```

## 4. 修复方案

### 4.1 多层缓存清除机制

```typescript
// RealTimeSyncService.ts
class RealTimeSyncService {
  // 新增：主动清除缓存的方法
  clearCache(chainId?: string) {
    if (chainId) {
      this.chainCache.delete(chainId);
    } else {
      this.chainCache.clear();
    }
    this.lastFetchTime = null;
  }

  // 新增：外部刷新触发
  triggerRefresh() {
    this.notifySubscribers();
    this.fetchFromDatabase();
  }
}
```

### 4.2 删除后强制刷新

```typescript
// App.tsx / useChainsDomain.ts
async function deleteChain(chainId: string) {
  // 1. 更新 React state
  setState((prev) => ({
    ...prev,
    chains: prev.chains.filter((c) => c.id !== chainId),
  }));

  // 2. 写入数据库
  await storage.softDeleteChain(chainId);

  // ✅ 3. 清除所有相关缓存
  realTimeSyncService.clearCache(chainId);
  queryOptimizer.invalidate('chains');

  // ✅ 4. 强制刷新回收箱状态
  recycleBinService.refresh();

  // ✅ 5. 创建新数组引用触发 useEffect 依赖更新
  setState((prev) => ({
    ...prev,
    chains: [...prev.chains], // 新引用
  }));
}
```

### 4.3 存储层的缓存协调

```typescript
// storage.ts
export function clearAllCaches() {
  // 应用层缓存
  realTimeSyncService.clearCache();

  // 存储层缓存
  queryOptimizer.clear();

  // 状态层缓存
  recycleBinCache.clear();
}
```

## 5. 预防措施

### 5.1 编码规范

```
✅ DO:
- 写操作后主动清除相关缓存
- 使用"事件驱动"通知其他模块更新
- 关键操作后验证状态一致性

❌ DON'T:
- 假设缓存会"自动"失效
- 只更新部分状态层而忽略其他
- 依赖 setTimeout/刷新页面来"修复"状态
```

### 5.2 缓存失效策略

```typescript
// 推荐：Write-Through 模式
async function writeData(data) {
  // 1. 先写数据库
  await database.write(data);

  // 2. 立即更新缓存（或失效缓存）
  cache.set(data.id, data);
  // 或: cache.invalidate(data.id);

  // 3. 通知订阅者
  eventBus.emit('data:changed', data.id);
}
```

### 5.3 代码审查清单

- [ ] 写操作是否清除了所有相关缓存？
- [ ] 是否有遗漏的缓存层？
- [ ] 删除操作是否通知了依赖方（如回收箱）？
- [ ] 是否存在"先读后写"的竞态条件？

### 5.4 调试技巧

```typescript
// 开发环境下的缓存一致性检查
if (isDev) {
  setInterval(async () => {
    const cachedChains = chainCache.getAll();
    const dbChains = await database.fetchChains();

    const inconsistencies = findInconsistencies(cachedChains, dbChains);
    if (inconsistencies.length > 0) {
      console.warn('Cache inconsistency detected:', inconsistencies);
    }
  }, 10000);
}
```

## 6. 相关提交

| Commit    | 描述                             |
| --------- | -------------------------------- |
| `0512678` | 主要修复：多层缓存清除机制       |
| `de3f1d8` | 强制刷新 UI 状态，新数组引用     |
| `3117d86` | 删除链条后状态同步问题分析       |
| `05c5b4b` | 删除和恢复文件需要刷新页面的问题 |
| `e0dc270` | 恢复功能的批量操作和状态更新     |

## 7. 经验教训

> **核心教训**: 在多层缓存架构中，**写操作的缓存失效必须是显式的、完整的**。不要假设：
>
> 1. React state 更新了，其他层就会自动同步
> 2. 数据库更新了，缓存就会自动失效
> 3. 用户刷新页面是可接受的"修复方案"

### 缓存一致性原则

```
1. 单一数据源 (Single Source of Truth)
   - 数据库是唯一权威来源
   - 缓存只是性能优化

2. 显式失效 (Explicit Invalidation)
   - 每次写操作后显式清除缓存
   - 不依赖 TTL 或自动过期

3. 订阅通知 (Publish-Subscribe)
   - 状态变更通过事件广播
   - 各模块自行决定如何响应
```

---

_作者: Postmortem Analysis System_
_日期: 2026-01-12_
