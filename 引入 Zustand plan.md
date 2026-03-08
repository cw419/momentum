# 引入 Zustand 管理 UI 瞬态状态

## Context

AppShellContainer 当前是"上帝组件"，同时管理域数据（chains、sessions 等）和 UI 瞬态状态（modal 开关、导航视图、编辑中的 chain 等）。6 个 `useState` + 16 字段的 `AppState` 全部集中在这里，11 个 domain hooks 都依赖 `state + setState`。

**痛点：**
- `stateRef` 变通：`useRsipDomain` 和 `useViewUrlSync` 等需要在异步回调中读最新 state，被迫用 `useRef(state)` 模式
- 域数据与 UI 状态耦合：domain hooks 里的 `setState` 调用同时更新 `chains` 和 `currentView`，原子性和职责不清晰
- prop drilling：Dashboard 接收 30+ props，AppShellView 透传 5 组 view model

**方案：** 引入 Zustand 只管 UI 瞬态状态（8 个字段），域数据保留在 `AppState` + domain hooks + storage 体系中。

## 边界规则

| 状态类型 | 管理方式 | 例子 |
|---------|---------|------|
| 持久化域数据 | `AppState` + domain hooks + `MomentumStorage` | chains, sessions, RSIP nodes |
| 瞬态 UI 状态 | Zustand store | modal 开关, pending ID, 当前视图, 编辑中 chain |
| 基础设施 | React Context | storage 实例, i18n, storage mode |

## Step 1 — 安装 Zustand + 创建 store

**新建 `src/stores/uiStore.ts`**（~100 行）

将以下 8 个状态迁入 Zustand：

```
showAuxiliaryJudgment: string | null     ← useState in AppShellContainer
showBettingModal: boolean                ← useState
pendingChainId: string | null            ← useState
currentSessionId: string | null          ← useState
activeSessionId: string | null           ← useState
currentView: ViewState                   ← AppState 字段
editingChain: Chain | null               ← AppState 字段
viewingChainId: string | null            ← AppState 字段
```

Store 设计：
- 单一 store，类型分为 ModalSlice + NavigationSlice
- 每个字段一个 setter action
- 复合 action：`navigateTo(view, opts?)`、`navigateToDashboard()`、`openBettingFlow(chainId, sessionId)`、`closeBettingFlow()`、`resetAllUI()`
- 导出 `createUIStore(overrides?)` 工厂函数（测试用）
- 导出 selector 函数（`selectCurrentView`、`selectBettingModal` 等）

## Step 2 — 缩减 AppState 类型

**修改 `src/types/app-state.ts`**

- 移除 `currentView`、`editingChain`、`viewingChainId` 三个字段
- `ViewState` 类型保留在此文件中（供 Zustand store 和其他模块引用）
- `AppState` 变为纯域数据容器（13 个字段）

**修改 `src/app/AppShellContainer.tsx`**

- `createInitialAppState()` 去掉三个 UI 字段
- 删除 5 个 `useState` 调用（modal/session 相关）
- 删除 `stateRef`（不再需要，Zustand 的 `getState()` 替代）
- 删除 `handleViewChainDetail`、`handleBackToDashboard`、`onNavigateToView`（由 store action 替代）

## Step 3 — 迁移 domain hooks

**核心原则：** domain hooks 不直接 import Zustand store。通过回调参数保持解耦和可测试性。

### `useChainsDomain.ts`

当前 4 处 `setState` 写 UI 字段：
- `handleCreateChain`: `currentView: 'editor', editingChain: null, viewingChainId` → 新增回调参数 `onNavigateToEditor: (viewingChainId: string | null) => void`
- `handleCreateTaskGroup`: `currentView: 'taskgroup-editor', editingChain: null` → 新增回调参数 `onNavigateToTaskGroupEditor: () => void`
- `handleEditChain`: `currentView: 'editor'/'taskgroup-editor', editingChain: chain` → 新增回调参数 `onEditChain: (chain: Chain, isTaskGroup: boolean) => void`
- `handleSaveChain`: `currentView: 'dashboard', editingChain: null` → 新增回调参数 `onNavigateToDashboard: () => void`；同时 `state.editingChain` 改为额外参数 `editingChain: Chain | null`

### `useRsipDomain.ts`

- `openRSIP()`: `currentView: 'rsip'` → 新增回调参数 `onNavigateToRSIP: () => void`
- 删除 `getState` 参数（不再需要 `stateRef`），域数据通过 `setState` 已经够用

### `useRecycleBinDomain.ts`

- `handleDeleteChain`: `currentView: 'dashboard'`（条件性）和 `viewingChainId: null`（条件性）→ 新增回调参数 `onChainDeleted: (chainId: string, hadActiveSession: boolean) => void`

### `useSessionsDomain.ts` + 子模块

参数接口中的 5 个 setter（`setActiveSessionId`、`setPendingChainId` 等）类型从 `Dispatch<SetStateAction<T>>` 改为简单回调 `(value: T) => void`。在 AppShellContainer 中接入 store action。

- `sessions/start.ts`: `currentView: 'focus'` → 新增回调 `onNavigateToFocus: () => void`
- `sessions/completion.ts`: `currentView: 'dashboard'`（2 处）→ 新增回调 `onNavigateToDashboard: () => void`

### `useBettingDomain.ts`

- setter 参数类型同上，改为简单回调

### `useRulesDomain.ts`

- `setShowAuxiliaryJudgment` 参数类型改为简单回调

## Step 4 — 迁移 app-level hooks

### `useViewUrlSync.ts`

- 不再接收 `state: AppState` + `setState`
- 改为：从 Zustand store 读写 `currentView`、`viewingChainId`、`editingChain`
- 仍接收 `chains: Chain[]`、`activeSession` 等域数据作为参数（用于 URL 解析）
- `stateRef` 可删除，用 `useUIStore.getState()` 替代

### `useViewValidation.ts`

- 从 Zustand store 读 `currentView`、`viewingChainId`
- 仍接收 `chains`、`activeSession` 作为参数
- redirect 时调用 `useUIStore.getState().navigateToDashboard()`
- `stateRef` 可删除

### `useAppDataLoad.ts`

- 加载完数据后调用 `useUIStore.getState().setCurrentView(activeSession ? 'focus' : 'dashboard')`
- 域数据仍走 `setState`

### `useAuthController.ts`

- 用户切换时额外调用 `useUIStore.getState().resetAllUI()`

### `usePeriodicCleanup.ts`

- 移除 `setShowAuxiliaryJudgment` 参数
- 直接 import store 或接收回调

## Step 5 — 更新 viewModelBuilders

**修改 `src/app/app-shell/viewModelBuilders.ts`**

Builder 的输入参数来源变化：
- `currentView`、`editingChain`、`viewingChainId` → 从 store 取值传入
- `showAuxiliaryJudgment`、`showBettingModal`、`pendingChainId`、`currentSessionId` → 从 store 取值传入
- Builder 函数签名不变，只是调用端（AppShellContainer）的数据来源变了

## Step 6 — 更新测试

### 新增测试

- `src/stores/__tests__/uiStore.test.ts` — store action 单元测试

### 更新现有测试

domain hook 测试（`useChainsDomain.test.ts`、`useRecycleBinDomain.test.ts`、`sessions/start.test.ts` 等）：
- 新增回调参数的 mock（`vi.fn()`）
- 验证回调被正确调用而不是检查 AppState 中的 UI 字段

app-level hook 测试（`useViewUrlSync.test.ts`、`useViewValidation.test.ts`、`useAppDataLoad.test.ts`）：
- mock `src/stores/uiStore` 模块 或使用 `createUIStore()` 工厂创建测试实例

组件测试（`AppShellContainer.test.ts`、`AppShellView.test.ts`）：
- 适配新的 store 依赖

## 文件变更清单

| 文件 | 变更类型 |
|------|---------|
| `src/stores/uiStore.ts` | 新建 |
| `src/stores/__tests__/uiStore.test.ts` | 新建 |
| `src/types/app-state.ts` | 移除 3 个字段 |
| `src/app/AppShellContainer.tsx` | 重大改动：删 5 useState + 3 handler，接入 store |
| `src/app/app-shell/viewModelBuilders.ts` | 输入参数来源变化 |
| `src/hooks/domains/useChainsDomain.ts` | 新增回调参数，setState 不再写 UI 字段 |
| `src/hooks/domains/useRsipDomain.ts` | openRSIP 改用回调 |
| `src/hooks/domains/useRecycleBinDomain.ts` | 新增回调参数 |
| `src/hooks/domains/useSessionsDomain.ts` | setter 类型简化 |
| `src/hooks/domains/sessions/start.ts` | 新增 onNavigateToFocus 回调 |
| `src/hooks/domains/sessions/completion.ts` | 新增 onNavigateToDashboard 回调 |
| `src/hooks/domains/useBettingDomain.ts` | setter 类型简化 |
| `src/hooks/domains/useRulesDomain.ts` | setter 类型简化 |
| `src/app/hooks/useViewUrlSync.ts` | 改用 store 读写 |
| `src/app/hooks/useViewValidation.ts` | 改用 store 读写 |
| `src/app/hooks/useAppDataLoad.ts` | 加载后设置 store |
| `src/app/hooks/useAuthController.ts` | 登出时 resetAllUI |
| `src/app/hooks/usePeriodicCleanup.ts` | 移除 setter 参数 |
| 约 10 个测试文件 | 适配新接口 |

## 风险与缓解

**双写原子性：** 迁移后 `setState`（域数据）和 store.set（UI 状态）是两个独立调用。React 18 在同一事件处理器或 microtask 内自动 batch，不会有中间渲染。但需注意 `await` 之后的写入可能不被 batch — 如果域数据写在 `await` 后面，确保 UI 状态写在同一个 microtask 中。

**editingChain 跨边界：** `useChainsDomain.handleSaveChain` 需要读 `editingChain`（现在在 store 中）来决定是编辑还是新建。解决方案：将 `editingChain` 作为参数传入 hook，AppShellContainer 从 store 取值后传入。

**stateRef 消除不完整：** 有些地方的 `stateRef` 是为了读域数据（如 `useViewValidation` 读 `chains`），不能完全删除，只能删除读 UI 状态的 ref。

## 验证方式

1. `npm run typecheck` — 类型无错误
2. `npm test` — smoke tests 通过
3. `npm run test:all` — 全量测试通过
4. `npm run lint` — ESLint 无新错误
5. `npm run quality:knip` — 无未使用的导出
6. `npm run build` — 生产构建成功
7. 手动验证：导航（dashboard ↔ editor ↔ detail ↔ focus ↔ rsip）、modal（押注、辅助判断）、编辑保存、删除恢复、URL 同步
