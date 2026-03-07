# RSIP Maintainability Refactor Plan

## Context

`useRsipDomain.ts` (755 行) 和 `RSIPView.tsx` (878 行) 是仓库中超过 300 行大文件预算的两个 RSIP 热点。参照 `useSessionsDomain` 已有的 composition + operation-module 拆分模式，将这两个文件拆分为可维护的小模块，同时新增 RSIP 节点级 intent API 到 storage ports，消除 RSIPView 中的死 props。

---

## Phase A: 基础 — 共享类型与纯函数提取

### A1: 创建 `src/hooks/domains/rsip/types.ts` (~50 行)

从 `useRsipDomain.ts` 提取：
- `MarkExecutionOptions`, `MarkViolationOptions` 接口
- `UseRsipDomainParams` 接口（改名为 `RsipDomainContext`）
- `INTERNALIZATION_TARGET_DAYS`, `DAY_IN_MS` 常量
- 新增 `SaveFns` 接口，包含 6 个 save 方法签名
- 新增 `ReadState` 类型别名: `() => AppState`

### A2: 创建 `src/hooks/domains/rsip/helpers.ts` (~30 行)

移出 3 个纯函数（不改变行为）：
- `computeInternalizationProgress()` (原 L48-51)
- `ensureDate()` (原 L53-56)
- `buildExecutionRecord()` (原 L58-76)

新增测试：`src/hooks/domains/rsip/__tests__/helpers.test.ts`

验证：`npx vitest run src/hooks/domains/__tests__/useRsipDomain.test.ts` 全绿

---

## Phase B: Domain Hook 操作模块拆分

参照 `useSessionsDomain.ts` (L48-120) 的 `createXxxHandlers(params)` 工厂模式。每个模块：
- 导出一个工厂函数，接收需要的依赖
- 不使用 React hooks，`tr`/`storage`/`setState` 通过参数注入
- 返回 handler 函数对象

### B1: `src/hooks/domains/rsip/runOperations.ts` (~150 行)

工厂：`createRunOperationHandlers(ctx, saveFns)`

迁移函数：
| 函数 | 类型 |
|------|------|
| `recordCollapse` | 写操作 — saveMeta + saveRunHistory |
| `startNewRun` | 写操作 — saveMeta |
| `recordTreeOpened` | 写操作 — saveMeta |
| `getMode` | 纯查询 |
| `isStrictMode` | 纯查询 |
| `hasOpenedToday` | 纯查询 |
| `calculateConstraintPower` | 纯计算 |
| `calculatePhaseDistribution` | 纯计算 |

测试：`src/hooks/domains/rsip/__tests__/runOperations.test.ts`

### B2: `src/hooks/domains/rsip/groupOperations.ts` (~60 行)

工厂：`createGroupOperationHandlers(ctx, saveFns)`

迁移函数：`createGroup`, `isGroupAlive`

测试：`src/hooks/domains/rsip/__tests__/groupOperations.test.ts`

### B3: `src/hooks/domains/rsip/libraryOperations.ts` (~130 行)

工厂：`createLibraryOperationHandlers(ctx, saveFns)`

迁移函数：`archiveToLibrary`, `restoreFromLibrary`

使用 `helpers.ts` 中的 `computeInternalizationProgress`

测试：`src/hooks/domains/rsip/__tests__/libraryOperations.test.ts`

### B4: `src/hooks/domains/rsip/nodeOperations.ts` (~230 行)

工厂：`createNodeOperationHandlers(ctx, saveFns, crossModuleFns)`

其中 `crossModuleFns = { archiveToLibrary, recordCollapse }` — 由 composition 层注入，避免循环依赖。

迁移函数：
| 函数 | 说明 |
|------|------|
| `markExecuted` | 相位推进 E0→E1→E2，执行记录追加 |
| `markViolated` | 违规级联：增强盾→组容错→递归移除→归档 |
| `reinforceNode` | 增强等级递增（E2 限定） |

内部使用 `helpers.ts` 的 `buildExecutionRecord`, `ensureDate`

测试：`src/hooks/domains/rsip/__tests__/nodeOperations.test.ts`（最大的模块测试）

### B5: `src/hooks/domains/rsip/taskLinkOperations.ts` (~120 行)

工厂：`createTaskLinkOperationHandlers(ctx, saveFns, nodeFns)`

其中 `nodeFns = { markExecuted, markViolated }` — 由 composition 层注入。

迁移函数：`saveTaskLinks`, `upsertTaskLinks`, `handleTaskEventIntegration`, `getRsipTaskActions`

测试：`src/hooks/domains/rsip/__tests__/taskLinkOperations.test.ts`

### B6: 重写 `src/hooks/domains/useRsipDomain.ts` 为 thin composition (~120 行)

模式与 `useSessionsDomain.ts` 完全一致：
```
const saveFns = { saveNodes, saveMeta, saveGroups, ... };  // 内部定义
const libraryOps = createLibraryOperationHandlers(ctx, saveFns);
const runOps = createRunOperationHandlers(ctx, saveFns);
const nodeOps = createNodeOperationHandlers(ctx, saveFns, {
  archiveToLibrary: libraryOps.archiveToLibrary,
  recordCollapse: runOps.recordCollapse,
});
const taskLinkOps = createTaskLinkOperationHandlers(ctx, saveFns, {
  markExecuted: nodeOps.markExecuted,
  markViolated: nodeOps.markViolated,
});
return { ...runOps, ...groupOps, ...libraryOps, ...nodeOps, ...taskLinkOps, openRSIP, saveFns... };
```

验证：原始 `useRsipDomain.test.ts` **全部测试零修改通过**（公共 API 完全不变）

---

## Phase C: Storage Port Intent API

### C1: 在 `src/storage/ports.ts` 的 `RsipStore` 接口新增 4 个方法

```typescript
upsertRSIPNode(node: RSIPNode): Promise<void>;
removeRSIPNode(nodeId: string): Promise<void>;
archiveRSIPNodeToLibrary(entry: RSIPLibraryEntry): Promise<void>;
appendRSIPRunRecord(record: RSIPRunRecord): Promise<void>;
```

### C2: `src/storage/localStorageAdapter.ts` — 实现 4 个新方法

读→改→写模式（与现有 localStorage 方法一致）

### C3: `src/infra/storage/supabase/rsip.ts` + `SupabaseStorage.ts` — 实现 4 个新方法

Supabase 侧：单行 upsert / delete / insert（比 replace-all 更高效）

### C4: `src/test/factories/storageMock.ts` — 添加 4 个 mock

### C5: 在操作模块中接入 intent API

`nodeOperations.ts` 中 `markExecuted`/`markViolated` 调用 `upsertRSIPNode`/`removeRSIPNode`；
`libraryOperations.ts` 中 `archiveToLibrary` 调用 `archiveRSIPNodeToLibrary`；
`runOperations.ts` 中 `recordCollapse` 调用 `appendRSIPRunRecord`。

既有 bulk save 方法保留给 import/export 和全量加载路径。

---

## Phase D: RSIPView 拆分

### D1: 创建 `src/components/rsip/rsipViewHelpers.ts` (~80 行)

提取纯辅助函数：`getSplitTemplates()`, `getFallbackUpdatedNodesForExecuted()`, `getFallbackUpdatedNodesForViolation()`, `SplitDraftItem` 类型

测试：`src/components/rsip/__tests__/rsipViewHelpers.test.ts`

### D2: 创建 `src/components/rsip/RSIPSplitModeSection.tsx` (~180 行)

拆分模式（split mode）完整提取：模板选择、行编辑、批量提交。自管理 `splitMode`/`splitGoal`/`splitItems` 状态。

### D3: 创建 `src/components/rsip/RSIPTreeTab.tsx` (~280 行)

Tree 标签页容器，组合：RSIPModeSwitch, RSIPDailyReminder, RSIPForm, RSIPSplitModeSection, RSIPCanvas, 严格模式卡片网格, RSIPTaskLinkPanel

### D4: 瘦身 `src/components/RSIPView.tsx` 为 shell (~120 行)

保留：header + tab bar + tab 路由 + violation dialog。4 个 tab 各委托给对应组件。

### D5: 清除死 props

从 `RSIPView.types.ts` 移除 `onSavePolicyLibrary` 和 `onSaveRunHistory`。
从 `src/app/app-shell/AppShellView.tsx` 移除对应的 prop 传递。

---

## 关键文件清单

### 新建文件 (约 14 个)
```
src/hooks/domains/rsip/types.ts
src/hooks/domains/rsip/helpers.ts
src/hooks/domains/rsip/nodeOperations.ts
src/hooks/domains/rsip/groupOperations.ts
src/hooks/domains/rsip/libraryOperations.ts
src/hooks/domains/rsip/runOperations.ts
src/hooks/domains/rsip/taskLinkOperations.ts
src/hooks/domains/rsip/__tests__/helpers.test.ts
src/hooks/domains/rsip/__tests__/nodeOperations.test.ts
src/hooks/domains/rsip/__tests__/groupOperations.test.ts
src/hooks/domains/rsip/__tests__/libraryOperations.test.ts
src/hooks/domains/rsip/__tests__/runOperations.test.ts
src/hooks/domains/rsip/__tests__/taskLinkOperations.test.ts
src/components/rsip/rsipViewHelpers.ts
src/components/rsip/RSIPSplitModeSection.tsx
src/components/rsip/RSIPTreeTab.tsx
```

### 修改文件 (约 9 个)
```
src/hooks/domains/useRsipDomain.ts         (755→~120 行)
src/components/RSIPView.tsx                 (878→~120 行)
src/components/RSIPView.types.ts            (移除 2 个死 props)
src/storage/ports.ts                        (新增 4 个 intent 方法)
src/storage/localStorageAdapter.ts          (实现 4 个新方法)
src/infra/storage/supabase/rsip.ts          (实现 4 个新方法)
src/infra/storage/supabase/SupabaseStorage.ts (接线 4 个新方法)
src/test/factories/storageMock.ts           (新增 4 个 mock)
src/app/app-shell/AppShellView.tsx          (移除 2 个死 prop 绑定)
```

### 不变文件（验证稳定）
```
src/app/AppShellContainer.tsx               (公共 API 不变，无需改动)
src/app/app-shell/lazyViews.ts              (导入路径不变)
```

---

## 执行顺序

```
A1 → A2 → B1 → B2 → B3 → B4 → B5 → B6   (domain hook 拆分，严格串行)
C1 → C2 → C3 → C4 → C5                     (storage intent，可与 D 并行)
D1 → D2 → D3 → D4 → D5                     (view 拆分，可与 C 并行)
```

每一步独立可提交，测试始终保持绿色。

---

## Verification

每步完成后运行：
```bash
npx vitest run src/hooks/domains/__tests__/useRsipDomain.test.ts src/infra/storage/supabase/__tests__/rsip.test.ts src/utils/storage/__tests__/rsip.test.ts src/app/app-shell/__tests__/AppShellView.test.tsx
npm run typecheck
npm run quality:large-files
```

最终预期：
- `useRsipDomain.ts` 和 `RSIPView.tsx` 均降至 ~120 行
- 所有新模块 < 300 行
- 原有 RSIP 测试零修改通过
- large-files 预算中 RSIP 相关条目减少 2 个
