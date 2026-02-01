# Momentum 大文件/服务层坏味道重构优化计划 (Implementation Plan)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal（目标）:** 在不改变用户行为的前提下，系统性降低 “大文件 + 过度服务拆分 + 薄包装器 + 重复缓存” 带来的维护成本，让规则系统与关键 UI 更易读、更好测、更容易改。

**Architecture（架构策略）:** 以“先护栏、再整合、后拆分”为顺序推进：先建立可重复的质量/回归检查基线；再消除重复与无效抽象（合并重复检测、移除薄包装器、统一缓存/错误处理）；最后再拆分大文件（保持对外 API 稳定，内部模块化）。

**Tech Stack:** Vite + React 18 + TypeScript + ESLint + Vitest（含 unit / integration / db / performance suites）

---

## 0. 范围、非目标与护栏（非常重要）

### 范围（Scope）
- **优先处理：** Exception Rule/Rule Manager 相关服务层、缓存、重复检测链路；以及“>300 行”文件中的核心热点（见下方清单）。
- **允许：** 重构/拆分文件、合并重复逻辑、删除未使用导出/代码、补充测试、改进错误处理（不改变对外行为）。

### 非目标（Non-goals）
- 不做 UI 视觉/交互设计改版（除非为保持行为一致必须做微调）。
- 不引入新的后端/数据库变更（Supabase schema/RPC 不在此计划内）。
- 不扩大公共 API 面（除非为兼容性保留 re-export）。

### 关键护栏（Guardrails）
- 每个变更块都必须通过：`npm run lint`、`npm run typecheck`、`npm test`（CI subset），并在阶段结束时跑 `npm run test:all`。
- **UI 不直接访问 Supabase**：继续通过 `useStorage()` → domain hooks → services → `MomentumStorage`（保持架构约束）。
- **每次只做一种改变**：合并/删文件/拆分不要混在一个 commit 中；拆分大文件时不顺手“顺便改行为”。
- **保留兼容入口**：拆分大文件时尽量保留原文件作为薄门面（facade）+ 内部模块，避免引入大范围 import 修改。

---

## 1. 基线与现状（建议先刷新一遍）

### 1.1 一键生成质量报告（推荐）
运行：
```powershell
powershell -ExecutionPolicy Bypass -File tools/quality/smell-audit.ps1
```
会生成/覆盖：
- `tools/quality/reports/knip.txt`
- `tools/quality/reports/ts-prune.txt`
- `tools/quality/reports/eslint-sonarjs.txt`
- `tools/quality/reports/madge-circular.txt`
- `tools/quality/reports/depcheck.txt`

### 1.2 “大文件”统计（>300 行）
> 注意：行数会随提交变化。以下命令用于生成最新列表（排除 tests、`database.types.ts` 等）。

```powershell
$root = (Resolve-Path '.').Path
Get-ChildItem -Recurse src -Include *.ts,*.tsx |
  Where-Object {
    $_.FullName -notmatch '\\\\(__tests__|test|tests)\\\\' -and
    $_.Name -notmatch '\\.(test|spec|integration\\.test|db\\.test|performance\\.test)\\.' -and
    $_.Name -ne 'database.types.ts'
  } |
  ForEach-Object {
    [PSCustomObject]@{
      File  = $_.FullName.Substring($root.Length + 1).Replace('\\','/')
      Lines = (Get-Content -Encoding UTF8 $_.FullName | Measure-Object -Line).Lines
    }
  } |
  Where-Object { $_.Lines -ge 300 } |
  Sort-Object Lines -Descending |
  Format-Table -AutoSize
```

**现状快照（2026-01-29，本地统计口径下）：** 共有 `33` 个文件 ≥ 300 行。Top 热点示例：

| 文件 | 行数 | 类型 |
|------|------|------|
| `src/components/IntroScreen.tsx` | 486 | 组件 |
| `src/services/RuleClassificationService.ts` | 480 | 服务 |
| `src/components/TaskGroupEditorView.tsx` | 471 | 组件 |
| `src/services/EnhancedDuplicationHandler.ts` | 462 | 服务 |
| `src/utils/LayoutStabilityMonitor.ts` | 457 | 工具类 |
| `src/services/RuleUsageTracker.ts` | 453 | 服务 |
| `src/types/index.ts` | 450 | 类型定义 |
| `src/components/BettingModalView.tsx` | 431 | 组件 |
| `src/services/RuleStateManager.ts` | 430 | 服务 |
| `src/utils/ruleSearchOptimizer.ts` | 427 | 工具类 |
| `src/services/ImportExportService.ts` | 415 | 服务 |
| `src/components/AccountModal.tsx` | 406 | 组件 |
| `src/services/EnhancedRuleValidationService.ts` | 385 | 服务 |
| `src/infra/storage/supabase/chains.ts` | 372 | 存储层 |
| `src/services/SystemHealthService.ts` | 368 | 服务 |

---

## 2. 识别的坏味道（问题 → 可执行改动点）

### 2.1 过度设计（Over-Engineering）
- **服务层碎片化**：同一业务域（Exception Rule）出现多层服务/门面，且职责边界不清。
- **多层间接调用**：例如 `ExceptionRuleManager → RuleCreator → EnhancedDuplicationHandler → RuleDuplicationDetector`。
- **同类能力多点实现**：重复检测/缓存/错误处理在多个文件里各写一份。

### 2.2 薄包装器反模式（Thin Wrapper）
- `RuleQueryService` / `RuleStatsService` 主要是 `try/catch + storage.xxx()` 的重复样板代码。

### 2.3 DRY/SRP 违背
- 重复的缓存与错误处理散落，导致改一次要改多处。
- 大文件将“组合/协调 + 业务逻辑 + UI 渲染”混在一起，难测试、难复用。

---

## 3. 实施计划（按优先级分阶段）

### Task 0: 建立隔离工作区与基线（必做）

**Files:**
- Modify: none（仅执行命令）

**Step 1: 创建 worktree（推荐）**
- Run: `git worktree add ../momentum-refactor-smells -b chore/refactor-smells`
- Expected: 新目录 `../momentum-refactor-smells`，新分支 `chore/refactor-smells`

**Step 2: 安装依赖**
- Run: `npm install`
- Expected: 无错误

**Step 3: 跑基线**
- Run: `npm run lint`
- Expected: PASS
- Run: `npm run typecheck`
- Expected: PASS
- Run: `npm test`
- Expected: PASS
- Run: `powershell -ExecutionPolicy Bypass -File tools/quality/smell-audit.ps1`
- Expected: `tools/quality/reports/*` 更新

---

## Phase 1（P1）: 最高优先级 - 消除重复/无效抽象（以 Rule 系统为中心）

### Task 1: 修复 knip 发现的未使用导出（低风险，先做）

**Files:**
- Modify: `src/components/TaskGroupEditorView.tsx`（移除 `export`）

**Step 1: 复核是否真的未被外部使用**
- Run: `rg -n \"TaskGroupEditorViewProps\" src`
- Expected: 仅在 `TaskGroupEditorView.tsx` 内部使用（或可确认外部不依赖）

**Step 2: 移除导出并类型自洽**
- 修改 `export type TaskGroupEditorViewProps` → `type TaskGroupEditorViewProps`

**Step 3: 验证**
- Run: `npm run typecheck`
- Expected: PASS
- Run: `npm test`
- Expected: PASS

---

### Task 2: 合并重复检测链路（RuleDuplicationDetector → EnhancedDuplicationHandler）

**Files:**
- Modify: `src/services/EnhancedDuplicationHandler.ts`
- Modify: `src/services/RuleDuplicationDetector.ts`（先变薄门面，最后删除）
- Modify: `src/services/__tests__/EnhancedDuplicationHandler.test.ts`
- Modify: `src/services/__tests__/RuleDuplicationDetector.test.ts`
- Search: `rg -n \"RuleDuplicationDetector\" src`

**Step 1: 固化行为（Characterization tests）**
- 目标：用现有测试补足边界场景，确保“合并前后行为一致”。
- Run: `npm run test:all -- src/services/__tests__/RuleDuplicationDetector.test.ts`
- Expected: PASS

**Step 2: 内部抽出纯函数/核心算法（先不动调用点）**
- 将 `RuleDuplicationDetector` 的核心判定逻辑以“纯函数”形式移动到 `EnhancedDuplicationHandler`（或新建同目录内部模块，如 `src/services/duplication/*`）。

**Step 3: RuleDuplicationDetector 变为薄门面（仅委托调用）**
- 让 `RuleDuplicationDetector` 内部仅负责参数整理与委托，减少重复逻辑。

**Step 4: 逐处迁移调用点（保持一次只改一处）**
- Run: `rg -n \"new RuleDuplicationDetector|RuleDuplicationDetector\\(\" src`
- 逐个改为调用 `EnhancedDuplicationHandler`（或统一入口），每改一处都：
  - Run: `npm run typecheck`
  - Run: `npm test`

**Step 5: 删除 RuleDuplicationDetector（收尾）**
- 当 `rg -n \"RuleDuplicationDetector\" src` 只剩测试或兼容代码时：`git rm src/services/RuleDuplicationDetector.ts`
- Run: `npm run test:all`
- Expected: PASS

---

### Task 3: 消除薄包装器（RuleQueryService / RuleStatsService）

**Files:**
- Modify: `src/services/ExceptionRuleManager.ts`（吸收对外查询/统计 API）
- Modify/Delete: `src/services/rule-manager/RuleQueryService.ts`
- Modify/Delete: `src/services/rule-manager/RuleStatsService.ts`
- Modify: `src/services/__tests__/ExceptionRuleManager.test.ts`（必要时补场景）
- Search: `rg -n \"RuleQueryService|RuleStatsService\" src`

**Step 1: 盘点对外 API（避免破坏调用方）**
- Run: `rg -n \"class RuleQueryService|class RuleStatsService|RuleQueryService\\.|RuleStatsService\\.\" src`
- 输出“方法清单 → 调用点清单”（写在 PR 描述或本计划的附录中）

**Step 2: 抽出统一错误处理包装（先复用/后新增）**
- 优先：寻找现有通用错误处理工具（如已有 `withErrorHandling`/logger/分类器），没有再新增最小工具。
- 目标：把重复 `try/catch` 变成一个可复用 helper（不引入新层级的“服务类”）。

**Step 3: ExceptionRuleManager 提供原本的查询/统计能力**
- 只做“搬运与整理”，不改变返回结构。

**Step 4: RuleQueryService / RuleStatsService 变薄门面 → 删除**
- 先让它们委托 `ExceptionRuleManager`，跑一轮全测试后再删除文件。
- Run: `npm run test:all`
- Expected: PASS

---

### Task 4: 统一缓存实现（ExceptionRuleCache 单一事实来源）

**Files:**
- Modify: `src/utils/cache/CacheCore.ts`
- Modify: `src/utils/cache/ExceptionRuleCache.ts`
- Inspect/Modify: `src/utils/exceptionRuleCache.ts`（兼容 re-export，尽量保留）
- Modify: `src/services/EnhancedDuplicationHandler.ts`（移除内部私有 cache）
- Modify: `src/services/EnhancedRuleValidationService.ts`（移除内部私有 cache）
- Test: `src/__tests__/CacheSystem.integration.test.ts`（必要时补覆盖）

**Step 1: 定义“缓存边界/失效策略”**
- 明确：缓存 key 维度（userId/ruleId/query params）、失效触发（create/update/delete/import/export）、TTL（如有）。

**Step 2: 收敛到 ExceptionRuleCache**
- 将服务内部 cache 逐步替换为 `ExceptionRuleCache`（或其单例 `exceptionRuleCache`），每替换一处就跑：
  - Run: `npm run typecheck`
  - Run: `npm test`

**Step 3: 如确有需要再加“命名空间”**
- 只有当缓存 key 冲突或失效策略不同才引入 `namespace`（避免提前设计）。

**Step 4: 验证缓存一致性**
- Run: `npm run test:integration`
- Expected: PASS

---

## Phase 2（P2）: 中优先级 - 拆分大文件（机械性拆分为主）

> 原则：**保留原文件为 facade**（继续 export 原来的对外符号），将内部逻辑搬到同目录子模块；避免“大范围 import 重写”。

### Task 5: 拆分 `src/services/RuleClassificationService.ts`

**Files:**
- Create: `src/services/rule-classification/RuleTypeValidator.ts`
- Create: `src/services/rule-classification/RuleSearcher.ts`
- Create: `src/services/rule-classification/RuleSuggestionEngine.ts`
- Create: `src/services/rule-classification/index.ts`
- Modify: `src/services/RuleClassificationService.ts`（变 facade）
- Test: `src/services/__tests__/RuleClassificationService.test.ts`

**Step 1: 先只移动“纯逻辑”**
- 把不依赖外部状态的逻辑优先下沉到子模块，并为关键纯函数补单测（如需要）。

**Step 2: RuleClassificationService 变薄**
- 只保留 orchestrator/组合逻辑与对外 API。

**Step 3: 验证**
- Run: `npm run test:all -- src/services/__tests__/RuleClassificationService.test.ts`
- Expected: PASS

---

### Task 6: 拆分 `src/services/RuleUsageTracker.ts`

**Files:**
- Create: `src/services/usage-tracking/UsageRecorder.ts`
- Create: `src/services/usage-tracking/UsageStatsCalculator.ts`
- Create: `src/services/usage-tracking/UsageTrendAnalyzer.ts`
- Create: `src/services/usage-tracking/index.ts`
- Modify: `src/services/RuleUsageTracker.ts`
- Test: `src/services/__tests__/RuleUsageTracker.test.ts`

**Step 1: 抽离计算逻辑 + 单测**
- 先把统计计算抽到纯函数模块，优先补单测覆盖边界（空数据、时间窗口、去重等）。

**Step 2: 验证**
- Run: `npm run test:all -- src/services/__tests__/RuleUsageTracker.test.ts`
- Expected: PASS

---

### Task 7: 拆分 `src/components/IntroScreen.tsx`

**Files:**
- Create: `src/components/intro/IntroScreen.tsx`（新入口）
- Create: `src/components/intro/introTranslations.ts`
- Create: `src/components/intro/IntroHeroSection.tsx`
- Create: `src/components/intro/IntroTheorySection.tsx`
- Create: `src/components/intro/IntroPrinciplesSection.tsx`
- Modify: `src/components/IntroScreen.tsx`（保留为 re-export 或薄门面，避免改动全局 import）
- Test: `src/components/__tests__/IntroScreen.language-toggle.test.tsx`

**Step 1: 先只拆 UI 子块**
- 每拆一个 section 就跑：`npm test -- src/components/__tests__/IntroScreen.language-toggle.test.tsx`

**Step 2: 保留旧 import 路径兼容**
- 让 `src/components/IntroScreen.tsx` 继续 `export { default } from './intro/IntroScreen'`（或等价方式）。

---

### Task 8: 拆分 `src/utils/LayoutStabilityMonitor.ts`

**Files:**
- Create: `src/utils/layout-monitor/LayoutShiftObserver.ts`
- Create: `src/utils/layout-monitor/DOMChangeObserver.ts`
- Create: `src/utils/layout-monitor/ResizeChangeObserver.ts`
- Create: `src/utils/layout-monitor/LayoutIssueDetector.ts`
- Create: `src/utils/layout-monitor/index.ts`
- Modify: `src/utils/LayoutStabilityMonitor.ts`（变 facade）

**Step 1: 不改变行为地拆分**
- 拆分时确保对外 API（构造参数、事件回调、返回值）不变。

**Step 2: 验证**
- Run: `npm run test:all`
- Expected: PASS

---

### Task 9: 拆分 `src/components/BettingModalView.tsx`

**Files:**
- Create: `src/components/betting-modal/BettingForm.tsx`
- Create: `src/components/betting-modal/BettingStates.tsx`
- Create: `src/components/betting-modal/BettingHeader.tsx`
- Create: `src/components/betting-modal/index.tsx`
- Modify: `src/components/BettingModalView.tsx`（保留兼容入口）

**Step 1: 以“局部提取组件”为主**
- 先提取无副作用的展示组件，再提取表单组件（保留 props 形状）。

**Step 2: 验证**
- Run: `npm test`
- Expected: PASS

---

### Task 10: 拆分 `src/components/TaskGroupEditorView.tsx`

**Files:**
- Create: `src/components/task-group-editor/BasicInfoSection.tsx`
- Create: `src/components/task-group-editor/AuxiliarySignalSection.tsx`
- Create: `src/components/task-group-editor/DurationSection.tsx`
- Create: `src/components/task-group-editor/index.tsx`
- Modify: `src/components/TaskGroupEditorView.tsx`

**Step 1: 先提取纯 UI 片段**
- 确保每个 section 接收明确 props，避免引入额外全局状态。

**Step 2: 验证**
- Run: `npm test`
- Expected: PASS

---

### Task 11: 拆分 `src/services/ImportExportService.ts`

**Files:**
- Create: `src/services/import-export/ImportService.ts`
- Create: `src/services/import-export/ExportService.ts`
- Create: `src/services/import-export/DataTransformers.ts`
- Create: `src/services/import-export/index.ts`
- Modify: `src/services/ImportExportService.ts`
- Test: `src/services/__tests__/ImportExport.integration.test.ts`

**Step 1: 先拆转换器（最容易测）**
- 把 DataTransformers 拆出来后可加 unit tests（如转换规则复杂）。

**Step 2: 验证集成行为**
- Run: `npm run test:integration -- src/services/__tests__/ImportExport.integration.test.ts`
- Expected: PASS

---

## Phase 3（P3）: 低优先级 - 清理与收尾

> **P3 目标补充（基于 Knip / ts-prune 报告）**：在继续拆 ≥300 行文件之前，先“降噪 + 清理真正未使用的导出”，避免后续拆分过程中反复搬运无用 API / barrel exports，且让质量报告更可信。

### Task 12A: 清理未使用代码（Knip + ts-prune 驱动）

**范围：**
- 只处理“确认未被项目引用”的导出/文件（包含 type-only import 场景）。
- 对“可能是误报/有意保留的 public API”先标记并延后，不强行删（例如 facade 里的 re-export 类型）。

**验证基线（每次改动都要跑）：**
- Run: `npm run lint`
- Run: `npm run typecheck`
- Run: `npm test`

**12A.1 Knip：未使用文件**
- Candidate: `src/services/rule-classification/index.ts`
  - Verify: `rg -n "from ['\\\"]\\.\\./services/rule-classification['\\\"]|rule-classification/index" src`
  - If 0 matches：删除该文件（或将调用方改为使用该 barrel，二选一；优先“减少层级/减少无用 re-export”）。
- ✅ Done：已删除 `src/services/rule-classification/index.ts`（lint/typecheck/test PASS）

**12A.2 Knip：未使用导出函数**
- Candidate: `calculateRuleScore - src/services/rule-classification/RuleSuggestionEngine.ts`
  - Verify: `rg -n "calculateRuleScore" src`
  - If 仅在定义文件内引用：去掉 `export`（保留内部函数）；若完全未使用则删除并保持行为不变。
- ✅ Done：`calculateRuleScore` 已改为内部函数（去掉 `export`，lint/typecheck/test PASS）

**12A.3 Knip：未使用导出类型（优先降噪，谨慎删）**
- 低风险（组件内部 props types）：`BettingFormProps` / `BettingHeaderProps` / `ErrorStateProps` / `SuccessStateProps`
  - Verify: `rg -n "BettingFormProps|BettingHeaderProps|ErrorStateProps|SuccessStateProps" src`
  - If 仅定义处：去掉 `export`（类型仍可在文件内使用）。
- ✅ Done：以上 4 个 props types 已去掉 `export`（lint/typecheck/test PASS）
- 中风险（barrel 的类型导出）：`src/services/usage-tracking/index.ts`、`src/utils/layout-monitor/index.ts`
  - Verify: `rg -n "from ['\\\"].*/usage-tracking['\\\"]|usage-tracking/index" src`
  - Verify: `rg -n "from ['\\\"].*/layout-monitor['\\\"]|layout-monitor/index" src`
  - If 0 matches：删除对应的“仅用于 re-export 的 type export”或删除整个 barrel（按实际情况）。
- ✅ Done：已移除 `src/services/usage-tracking/index.ts` 的未使用 type re-export（4 个类型）
- ✅ Done：已移除 `src/utils/layout-monitor/index.ts` 的未使用 type re-export（`LayoutIssue`）
- 高风险（facade 兼容性导出）：`src/services/ImportExportService.ts` / `src/services/import-export/index.ts` 的 `Exported*` 类型
  - 原则：优先保留（兼容性），除非明确确认全项目无引用且我们接受 API 收缩。
  - Verify: `rg -n "ExportedChain|ExportedCompletionHistory|ExportedRSIPMeta|ExportedRSIPNode" src`
  - If 0 matches：在计划最后阶段再统一处理（避免 churn）。
- ✅ Done：已确认全仓库 0 引用后，移除 `ImportExportService.ts` 与 `src/services/import-export/index.ts` 的 `Exported*` re-export（lint/typecheck/test PASS）

**12A.4 ts-prune：真正未使用导出（作为“候选清单”，需要二次确认）**
- 原则：ts-prune 可能对动态 import、测试引用、入口文件引用等场景误判；仅当满足以下条件才改：
  1) `rg` 全仓库确认无引用（包含 tests / lazy import 语句），且
  2) 删除/取消导出后通过 `lint/typecheck/test`，且
  3) 不属于“约定式入口导出”（例如 app 入口 default export、provider 的公共入口等）。

### Task 12: 评估并处理剩余 “≥300 行” 文件（Backlog）

**Step 1: 先按“影响面”排序**
- 优先：被频繁改动、SonarJS 高复杂度、bug 多发、线上性能敏感的模块。

**Step 2: 每次只拆一个文件**
- 拆分模板：保留 facade → 抽纯函数/子组件 → 跑相关测试 → 提交。

**12.0 拆分顺序建议（结合“改动频率 + 热点”）**
1. ✅ `src/services/RuleStateManager.ts`（已拆分到 `src/services/rule-state/*`，原文件已降到 <300 行）
2. ✅ `src/services/EnhancedDuplicationHandler.ts`（提取到 `src/services/duplication/enhanced-handler/*`，原文件已降到 <300 行）
3. ✅ `src/utils/ruleSearchOptimizer.ts`（提取到 `src/utils/rule-search-optimizer/*`，原文件已降到 <300 行）
4. ✅ `src/components/AccountModal.tsx`（提取到 `src/components/account-modal/*`，原文件已降到 <300 行）
5. ✅ `src/components/VirtualizedRuleList.tsx`（提取到 `src/components/virtualized-rule-list/*`，原文件已降到 <300 行）
6. ✅ `src/services/import-export/ImportService.ts`（提取到 `src/services/import-export/import/*`，原文件已降到 <300 行）

> 注：`ImportService.ts` 已拆分完成并降到 <300 行；后续再决定是否继续处理其他 ≥300 行模块（避免一边拆一边又回头删/改导出）。

---

## 4. 验证策略（自动化 + 手动回归）

### 自动化（每个阶段都要过）
```bash
npm run lint
npm run typecheck
npm test
npm run test:all
npm run test:integration
```

### 手动回归（阶段结束至少跑一轮）
- [ ] 创建新规则（验证重复检测）
- [ ] 搜索规则
- [ ] 查看规则使用统计
- [ ] 导入/导出功能
- [ ] IntroScreen 语言切换/显示正常

---

## 5. Done Gate（完成标准：可量化）

- `npm run lint` / `npm run typecheck` / `npm test` / `npm run test:all` 全部 PASS
- `tools/quality/smell-audit.ps1` 输出的报告无“新增红线”（例如：Madge 仍无循环依赖；SonarJS 不通过“关规则”来降低指标）
- ≥300 行文件数量显著下降（建议目标：`33 → <= 20`；或至少 Top 10 中的文件平均行数下降 30%）
- Exception Rule 子系统调用链更短：重复检测/缓存/错误处理实现只有一个权威版本（不再多点维护）

---

## 6. 风险评估与缓解

| 风险点 | 风险等级 | 缓解措施 |
|------|----------|----------|
| 合并重复检测逻辑导致边界行为变化 | 高 | 先补 characterization tests；先“薄门面委托”再删除 |
| 移除薄包装器引发调用方破坏 | 中 | 先做 API/调用点盘点；先委托再删除；每次只迁移一个调用点 |
| 拆分大文件引入 UI 细微行为变化 | 中 | 保留 facade；用已有组件测试兜底；必要时补最小回归测试 |
| 缓存失效策略变更造成旧数据/错误命中 | 中 | 明确失效触发点；补 integration tests；分步替换缓存调用 |

---

## 7. 预期收益（以可维护性为主）

- **维护成本**：规则系统“重复检测/缓存/错误处理”不再多点维护，修改路径缩短
- **可读性/可测性**：大文件拆分为可单测的纯函数模块 + 可复用 UI section
- **变更风险**：以“薄门面 + 内部模块化”方式拆分，显著降低一次性大范围 import 改动
