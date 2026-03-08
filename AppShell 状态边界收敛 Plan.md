# AppShell 状态边界收敛 Plan

## Context

`AppShellContainer` 通过 13+ domain hooks 收集数据后，以 **49 个扁平 props** 透传到 `AppShellView`。这导致：
- View 的函数签名有 48 个解构参数（第 21-68 行）
- Container 的 JSX 传参段长达 50 行（第 232-283 行）
- 测试 mock factory 不完整（缺少 ~12 个 RSIP 相关 props）
- 无 per-component 渲染热点观测，"是否需要 Zustand" 缺乏数据支撑

目标：把 49 个扁平 props 收成 5 个分组 ViewModel（`app` / `dashboard` / `rsip` / `session` / `pet`），顺带清理 2 个死 props，补上 dev-only render profiling。**不引入 Zustand，不改下游组件 API**。

---

## Task 1 — 创建 ViewModel 类型定义

**新建** `src/app/app-shell/viewModels.types.ts`（~100 行）

从 `types.ts` 中抽出扁平 props，分组为 5 个接口：

### `AppViewModel`
```
state: AppState
isInitialized: boolean
isLoadingData: boolean
onNavigateToView: (view: ViewState) => void
```

### `DashboardViewModel`
```
// Chains CRUD
handleCreateChain, handleCreateTaskGroup, handleEditChain, handleSaveChain
// Navigation
handleViewChainDetail, handleBackToDashboard
// Scheduling (dashboard + group 分支共用)
handleScheduleChain, handleStartChain, handleCancelScheduledSession, handleCompleteBooking
// RecycleBin
handleDeleteChain, handleRestoreChains, handlePermanentDeleteChains
// Import/Group
handleImportChains, handleImportUnits, handleUpdateTaskRepeatCount, handleReorderUnit
// RSIP 入口
openRSIP
```

### `RsipViewModel`
```
// 持久化
saveNodes, saveMeta, saveGroups, saveTaskLinks
// 执行操作
markExecuted, markViolated, reinforceNode, restoreFromLibrary, createGroup
upsertTaskLinks, getTaskActions
// 跨 feature 引用（RSIPView 需要）
handleStartChain, handleScheduleChain
```

### `SessionViewModel`
```
// Modal 可见性
showAuxiliaryJudgment, setShowAuxiliaryJudgment
showBettingModal, pendingChainId, currentSessionId
// Focus mode
handleCompleteSession, handleInterruptSession, handlePauseSession, handleResumeSession
// Betting
handleBetPlaced, handleBetCancelled
// Auxiliary judgment
handleAuxiliaryJudgmentFailure, handleAuxiliaryJudgmentAllow
```

### `PetViewModel`
直接复用 `usePetDomain()` 的返回形状（pet, mood, isLoading, hasPet + 9 actions）。

### 新 `AppShellViewProps`
```typescript
{ app: AppViewModel; dashboard: DashboardViewModel; rsip: RsipViewModel; session: SessionViewModel; pet: PetViewModel }
```

**死 props 清理**：`saveRSIPPolicyLibrary` 和 `saveRSIPRunHistory` 在 `AppShellView.tsx` 中从未解构使用，从 View 边界移除。Container 内部仍通过 `useRsipDomain` 调用它们。

辅助类型 `ImportChainsOptions`、`RSIPExecutionActionOptions`、`RSIPViolationActionOptions` 保留在 `types.ts` 并 export，供 `viewModels.types.ts` 引用。

---

## Task 2 — 创建 builder 纯函数

**新建** `src/app/app-shell/viewModelBuilders.ts`（~120 行）

5 个纯函数，从 domain hook 返回值组装 ViewModel：

```
buildAppViewModel(inputs)      → AppViewModel
buildDashboardViewModel(inputs) → DashboardViewModel
buildRsipViewModel(inputs)      → RsipViewModel
buildSessionViewModel(inputs)   → SessionViewModel
buildPetViewModel(petDomain)    → PetViewModel
```

每个 builder 只做属性选取和重命名（如 `getRsipTaskActions → getTaskActions`），不包含逻辑。输入类型用 inline interface，不依赖 domain hook 的 ReturnType。

---

## Task 3 — builder 单元测试

**新建** `src/app/app-shell/__tests__/viewModelBuilders.test.ts`（~120 行）

覆盖 5 个 builder 的字段映射和关键动作透传：
- mock 输入 → 调用 builder → 断言输出形状和值
- 验证 `handleStartChain` 在 dashboard 和 rsip 两个 model 中引用同一 fn reference

---

## Task 4 — 扩展 reactPerformanceMonitor

**修改** `src/utils/reactPerformanceMonitor.ts`

新增 per-component 追踪：

```typescript
interface ComponentRenderMetrics {
  renderCount: number;
  totalDuration: number;
  maxDuration: number;
  lastDuration: number;
}

// 类内新增
private componentMetrics = new Map<string, ComponentRenderMetrics>();

trackComponentRender(id: string, phase: string, actualDuration: number): void
getComponentStats(): Map<string, ComponentRenderMetrics & { avgDuration: number }>
// reset() 同步清空 componentMetrics
```

`trackComponentRender` 在内部调用已有的 `trackRender(id, actualDuration)` 保持兼容。

---

## Task 5 — 创建 DevProfiler

**新建** `src/app/app-shell/DevProfiler.tsx`（~20 行）

```typescript
export function DevProfiler({ id, children }: { id: string; children: ReactNode }) {
  if (!isDev) return <>{children}</>;
  return <Profiler id={id} onRender={onRenderCallback}>{children}</Profiler>;
}
```

- `onRenderCallback` 调用 `reactPerformanceMonitor.trackComponentRender`
- 生产环境零开销（直接返回 children）

---

## Task 6 — 重写 AppShellView

**修改** `src/app/app-shell/AppShellView.tsx`

变更清单：
1. 签名从 48 个解构参数改为 `{ app, dashboard, rsip, session, pet }`
2. 全部属性访问加命名空间前缀（如 `isInitialized → app.isInitialized`，`handleCreateChain → dashboard.handleCreateChain`，`saveRSIPNodes → rsip.saveNodes`）
3. 移除对 `saveRSIPPolicyLibrary`、`saveRSIPRunHistory` 的任何引用（它们本来就未在 View 中使用）
4. 在 4 个 feature 边界包裹 `<DevProfiler>`：
   - `case 'rsip'` → `<DevProfiler id="rsip-view">`
   - `default` (dashboard) → `<DevProfiler id="dashboard-view">`
   - `case 'focus'` → `<DevProfiler id="focus-view">`
   - PetWidget 区域 → `<DevProfiler id="pet-widget">`

**同时修改** `src/app/app-shell/types.ts`：
- 移除 `AppShellViewProps` 中的 49 个扁平字段
- 改为 re-export `AppShellViewProps` from `viewModels.types.ts`
- 保留 `ImportChainsOptions`、`RSIPExecutionActionOptions`、`RSIPViolationActionOptions` 并 export

---

## Task 7 — 重写 AppShellContainer

**修改** `src/app/AppShellContainer.tsx`

变更清单：
1. import builders from `viewModelBuilders.ts`
2. 在 JSX return 前组装 5 个 ViewModel：
   ```
   const app = buildAppViewModel({ state, isInitialized, isLoadingData, onNavigateToView });
   const dashboard = buildDashboardViewModel({ chains, sessions, recycleBin, importExport, group, rsip, navigation });
   const rsip = buildRsipViewModel({ rsipDomain, sessions });
   const session = buildSessionViewModel({ showAuxiliaryJudgment, ..., sessions, betting, rules });
   const pet = buildPetViewModel(petDomain);
   ```
3. JSX 从 50 行传参缩减为 `<AppShellView app={app} dashboard={dashboard} rsip={rsipVM} session={session} pet={pet} />`
4. 移除 `saveRSIPPolicyLibrary`、`saveRSIPRunHistory` 的解构赋值和传参（Container 内部仍可通过 `useRsipDomain` 访问，只是不再传给 View）

---

## Task 8 — 更新 AppShellView 测试

**修改** `src/app/app-shell/__tests__/AppShellView.test.tsx`

- `createProps()` factory 改为 5 个分组，**补全**之前缺失的 ~12 个 RSIP props
- 所有 override 改为 `{ app: { isInitialized: false } }` 格式
- `showAuxiliaryJudgment`、`showBettingModal` 等改从 `session` 对象读取
- 测试语义不变（7 个 view 分支 + modal + pet + null 前置条件）

---

## Task 9 — 更新 AppShellContainer 测试

**修改** `src/app/__tests__/AppShellContainer.test.tsx`

- `AppShellView` mock 改为访问分组 props（`props.app.isInitialized`、`props.dashboard.handleCreateChain`、`props.dashboard.handleDeleteChain`、`props.dashboard.openRSIP`）
- 断言逻辑不变

---

## Task 10 — Profiling 相关测试

**新建** `src/utils/__tests__/reactPerformanceMonitor.componentMetrics.test.ts`（~60 行）
- 多次 `trackComponentRender` 后 `getComponentStats` 返回正确 count/avg/max
- 多组件独立追踪
- `reset()` 清空 componentMetrics

**新建** `src/app/app-shell/__tests__/DevProfiler.test.tsx`（~40 行）
- dev 模式下渲染 children
- onRender 回调触发 `trackComponentRender`

---

## 依赖关系

```
Task 1 (types) ──→ Task 2 (builders) ──→ Task 3 (builder tests)
                         ↓
Task 4 (monitor ext) → Task 5 (DevProfiler)
                         ↓
                    Task 6 (View) ──→ Task 8 (View tests)
                         ↓
                    Task 7 (Container) → Task 9 (Container tests)

Task 4 → Task 10 (profiling tests)
Task 5 → Task 10
```

可并行：Task 1-3 与 Task 4-5 独立，可同时进行。

---

## 关键文件清单

| 文件 | 操作 | 当前行数 |
|------|------|----------|
| `src/app/app-shell/viewModels.types.ts` | 新建 | ~100 |
| `src/app/app-shell/viewModelBuilders.ts` | 新建 | ~120 |
| `src/app/app-shell/DevProfiler.tsx` | 新建 | ~20 |
| `src/app/app-shell/types.ts` | 修改 | 171 → ~55 |
| `src/app/app-shell/AppShellView.tsx` | 修改 | 354 → ~340 |
| `src/app/AppShellContainer.tsx` | 修改 | 284 → ~250 |
| `src/utils/reactPerformanceMonitor.ts` | 修改 | 181 → ~220 |
| `src/app/app-shell/__tests__/viewModelBuilders.test.ts` | 新建 | ~120 |
| `src/app/app-shell/__tests__/DevProfiler.test.tsx` | 新建 | ~40 |
| `src/utils/__tests__/reactPerformanceMonitor.componentMetrics.test.ts` | 新建 | ~60 |
| `src/app/app-shell/__tests__/AppShellView.test.tsx` | 修改 | 346 |
| `src/app/__tests__/AppShellContainer.test.tsx` | 修改 | 217 |

所有文件 ≤ 300 行。

---

## 验证

1. `npx vitest run src/app/app-shell/__tests__/viewModelBuilders.test.ts` — builder 单测
2. `npx vitest run src/utils/__tests__/reactPerformanceMonitor.componentMetrics.test.ts` — per-component 追踪
3. `npx vitest run src/app/app-shell/__tests__/DevProfiler.test.tsx` — Profiler 包装
4. `npx vitest run src/app/app-shell/__tests__/AppShellView.test.tsx` — View 全分支
5. `npx vitest run src/app/__tests__/AppShellContainer.test.tsx` — Container 组合
6. `npm run typecheck` — 全项目类型检查
7. `npx vitest run` — 全量测试回归

---

## Zustand 闸门

本轮**不添加 Zustand**。只有满足以下两个条件之一时才开后续方案：
1. 收敛后 DevProfiler 显示跨 feature render cascade 的 max duration > 16ms
2. 收敛后仍存在单个用户流需跨多个 sibling ViewModel 协调读写的痛点
