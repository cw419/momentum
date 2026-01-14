# Momentum 项目历史遗留问题分析与可维护性改进计划（已 fact-check）

> 更新时间：2026-01-13  
> 本文已对关键数据做了核实，并按计划完成 Phase 1 + 部分 Phase 4。

## 〇、Fact check（基于 origin/new-feature-branch@HEAD 与当前修复）

- Jest/Vitest 混用：HEAD 中 `jest.*` 出现在 `src/` 下 22 个文件；现已全部替换为 `vi.*`（`rg "\\bjest\\." src` 无匹配）。
- 测试规模：`src/` 下共有 40 个 `*.{test,spec}.*` 文件；`npm test`（CI 配置）现运行 30 个单元测试文件（排除 `*.integration|*.db|*.performance`），共 521 个测试通过。
- `as any`：HEAD 中 `as any` 出现 148 次（`git grep -o "\\bas any\\b" HEAD -- src`）；当前分支已将生产代码（排除 tests/mocks）中的 `as any` 清零，并新增 ESLint 规则禁止新增（tests/harness 中仍保留少量 `as any` 用于构造边界用例）。
- SQL 脚本：根目录实际为 13 个调试/校验 SQL（非 41+），已移动到 `sql/`。
- `src/test/setup.db.ts`：mock 目标 `../lib/supabase` 存在（`src/lib/supabase.ts`），不存在“引用不存在模块”的问题。
- `src/test/setup.integration.ts`：此前在全局启用 fake timers 未恢复，已在 `afterAll` 恢复 `vi.useRealTimers()`。
- `CLAUDE.md` domain hooks：已补齐 `usePetDomain`、`useCheckinDomain`、`useSafeSaveChains`。
- `debugRuleCreation`：全局暴露已改为仅 dev 模式启用。

## 一、发现的历史遗留问题总览

| 类别 | 数量 | 严重程度 | 影响 |
|------|------|----------|------|
| Jest/Vitest 混用 | 22 文件（已修复） | **Critical** | 测试可能无法正确执行 |
| `as any` 类型转换 | 148 处（HEAD；生产代码已清零） | **Critical** | 类型安全受损 |
| CI 测试覆盖缺口 | 以前 4/40 文件；现 30/40（单元测试） | **High** | 回归风险 |
| 未类型化参数 | 待统计（TBD） | **High** | 运行时错误风险 |
| 大文件 (>600行) | 5 个已确认 | **High** | 难以维护/测试 |
| 根目录文件杂乱 | SQL 13 个（已迁移到 `sql/`） | **Medium** | 导航困难 |
| 文档不一致 | 1 处已修复（CLAUDE hooks） | **Medium** | 开发者困惑 |
| 调试代码残留 | 1 处（已改为 dev-only） | **Medium** | 生产环境风险 |

---

## 二、详细问题清单

### 2.1 测试系统问题（最紧急）

#### 问题 1：Jest/Vitest API 混用
**严重程度：Critical**

20+ 测试文件使用 `jest.fn()`, `jest.spyOn()`, `jest.mock()` 而项目配置的是 **Vitest**：

```
受影响的主要文件：
- src/__tests__/ChainEditor.responsive.test.tsx（line 23, 34, 91）
- src/__tests__/PureDOMSlider.performance.test.tsx（line 11, 38, 43）
- src/__tests__/ui-fixes.test.tsx（line 15-17）
- src/utils/__tests__/forwardTimer.test.ts
- src/utils/__tests__/schemaChecker.test.ts
- src/services/__tests__/RecycleBinService.test.ts
- src/services/__tests__/RuleScopeManager.test.ts
- ...等 13+ 其他文件
```

**修复方案**：将所有 `jest.*` 替换为 `vi.*`

#### 问题 2：CI 测试覆盖严重不足
**严重程度：High**

（历史情况）旧版 `vitest.ci.config.ts` 只包含 4 个测试文件：
- `src/services/__tests__/CheckinService.test.ts`
- `src/services/__tests__/RuleClassificationService.test.ts`
- `src/components/__tests__/PureDOMSlider.mobile.test.tsx`
- `src/utils/__tests__/time.formatting.test.ts`

**Fact check**：`src/` 下共有 40 个 `*.{test,spec}.*` 文件。  
**现状**：`vitest.ci.config.ts` 已改为运行全部单元测试（30 个文件，排除 `*.integration|*.db|*.performance`），`npm test` 已全绿。

#### 问题 3：测试设置文件问题
- `src/test/setup.db.ts` - `vi.mock('../lib/supabase')` 指向存在的模块（`src/lib/supabase.ts`），无需修复
- `src/test/setup.integration.ts` - fake timers 之前未恢复，已在 `afterAll` 增加 `vi.useRealTimers()`

---

### 2.2 类型安全问题

#### 问题 4：大量 `as any` 类型转换（148 处，HEAD）

主要集中在 Supabase 基础设施层：

| 文件 | `as any` 数量 | 根本原因 |
|------|---------------|----------|
| `src/infra/storage/supabase/mappers.ts` | 20+ | snake_case → camelCase 映射 |
| `src/infra/storage/supabase/betting.ts` | 12+ | API 响应处理 |
| `src/infra/storage/supabase/history.ts` | 8 | 可选字段映射 |
| `src/infra/storage/supabase/retry.ts` | 6 | 错误包装 |
| `src/infra/storage/supabase/userSettings.ts` | 5 | 类型强制转换 |

**修复方案**：创建类型安全的映射器接口

#### 问题 5：未类型化的参数（待统计）
```typescript
// 示例问题
src/infra/storage/supabase/chains.ts:6    - formatDbError(error: any)
src/services/ErrorRecoveryManager.ts:17   - context: any
src/services/RealTimeSyncService.ts:12    - (data: any) => void
src/components/ImportExportModal.tsx      - raw: any, h: any, node: any
```

---

### 2.3 代码架构问题

#### 问题 6：超大组件违反单一职责原则

| 组件 | 行数 | 问题 |
|------|------|------|
| `RSIPView.tsx` | 970 | RSIP 树 + Canvas + 拖放 + 缩放 |
| `ImportExportModal.tsx` | 722 | 导入 + 导出 + 验证 + 错误处理 |
| `ExceptionRuleManager.tsx` | 650 | 规则创建/验证/列表/统计 |
| `ExceptionRuleManager.ts` (service) | 845 | 规则 CRUD/验证/分类/迁移/缓存 |
| `GroupView.tsx` | 603 | 组渲染 + 任务重复 + 时间限制 |

**修复方案**：按 Container + View 模式拆分

#### 问题 7：调试代码残留在生产环境
`src/utils/debugRuleCreation.ts:38-39`：
```typescript
if (typeof window !== 'undefined' && isDev) {
  window.debugRuleCreation = debugRuleCreation;  // 仅开发环境暴露
}
```

---

### 2.4 项目结构问题

#### 问题 8：根目录文件杂乱

**SQL 调试/校验脚本（13 个）已移动到 `sql/` 目录：**
- `sql/check_bet_integrity.sql`
- `sql/create-test-deleted-chain.sql`
- `sql/debug-deleted-chains.sql`
- `sql/debug_betting_system.sql`
- `sql/quick-database-fix.sql`
- `sql/quick-fix-database.sql`
- `sql/quick-test-for-current-user.sql`
- `sql/simple-test-chain.sql`
- `sql/soft-delete-existing-chain.sql`
- `sql/test-soft-delete.sql`
- `sql/test_bet_atomicity.sql`
- `sql/verify-all-chains.sql`
- `sql/verify-database-fix.sql`

**10+ 个文档文件**应该移到 `docs/` 目录（已迁移核心文档）：
- `docs/CHAIN_EDITOR_GUIDE.md`
- `docs/DAILY_CHECKIN_SUMMARY.md`
- `docs/daily-checkin-api-guide.md`
- `docs/DEBUGGING_GUIDE.md`
- `docs/DEPLOYMENT.md`
- `docs/FIXES_SUMMARY.md`

**过时的工件已移动到 `tools/experiments/legacy-artifacts/`：**
- `tools/experiments/legacy-artifacts/debug-write-session.js` - 孤立脚本
- `tools/experiments/legacy-artifacts/momentum-update.bundle` - 二进制工件
- `tools/experiments/legacy-artifacts/test-touch-fix.html` - 调试 HTML

---

### 2.5 文档不一致问题

#### 问题 9：CLAUDE.md 文档遗漏

`CLAUDE.md` 中列出的 domain hooks 不完整：
- **缺失**：`usePetDomain`（虚拟宠物系统）
- **缺失**：`useCheckinDomain`（每日签到）
- **缺失**：`useSafeSaveChains`（工具 hook）

注意：`AGENTS.md` 中正确列出了这些 hooks
（已修复：`CLAUDE.md` 已补齐以上 hooks）

#### 问题 10：AI Team Assignments 表格
CLAUDE.md 中的 AI 团队分配表是参考性质，实际并未配置这些代理

---

## 三、可维护性改进建议（优先级排序）

### Phase 1：紧急修复（1-2 天）

| 任务 | 文件/范围 | 影响 | 状态 |
|------|-----------|------|------|
| 1. 替换所有 `jest.*` 为 `vi.*` | 22 个测试文件 | 测试可正确执行 | 已完成 |
| 2. 扩充 CI 测试覆盖 | `vitest.ci.config.ts` | 回归保护 | 已完成 |
| 3. 修复测试设置文件 | `setup.integration.ts`（timers） | 测试稳定性 | 已完成 |
| 4. 移除/保护调试代码 | `debugRuleCreation.ts` | 生产安全 | 已完成 |

### Phase 2：类型安全（1 周）

| 任务 | 文件/范围 | 影响 | 状态 |
|------|-----------|------|------|
| 1. 创建类型安全的 Supabase 映射器 | `src/infra/storage/supabase/mappers.ts` | 消除 20+ `as any` | 已完成 |
| 2. 添加错误类型守卫 | `src/infra/storage/supabase/*.ts` | 消除 30+ `as any` | 已完成 |
| 3. 类型化回调参数 | 各服务文件 | 消除未类型化参数 | 进行中 |
| 4. 禁止新增 `as any` | 添加 ESLint 规则 | 防止债务增长 | 已完成 |

备注：已完成 Supabase 层类型化与错误守卫，并在生产代码中清零 `as any`；剩余 `as any` 主要位于测试/Mock，用于测试边界场景。

### Phase 3：架构重构（2-3 周）

| 任务 | 目标 | 状态 |
|------|------|------|
| 1. 拆分 `RSIPView.tsx` | 970 行 → 3 个文件（~300 行/文件） | 待处理 |
| 2. 拆分 `ImportExportModal.tsx` | 722 行 → Container + View + 域逻辑 | 待处理 |
| 3. 拆分 `ExceptionRuleManager` | 组件 + 服务各自拆分 | 待处理 |
| 4. 统一错误处理模式 | 创建可复用的 `ErrorHandler` 工具 | 已启动 |

### Phase 4：项目整理（1 周）

| 任务 | 影响 | 状态 |
|------|------|------|
| 1. 移动 SQL 文件到 `sql/` 目录 | 根目录清洁 | 已完成 |
| 2. 移动文档到 `docs/` 目录 | 导航清晰 | 部分完成 |
| 3. 更新 `.gitignore` | 排除 `.lighthouse/`、临时文件 | 已完成 |
| 4. 更新 CLAUDE.md | 添加缺失的 hooks 文档 | 已完成 |
| 5. 合并 vitest 配置 | 5 个配置 → 1 个配置 + profiles | 待处理 |

---

## 四、验证方案

### 测试修复验证
```bash
# 修复 Jest → Vitest 后
npm run test:all  # 所有测试应该通过

# CI 覆盖扩充后
npm test          # CI 测试集应包含更多测试
```

### 类型安全验证
```bash
npm run typecheck  # 应该零错误
# 检查 `as any` 数量是否减少
# macOS/Linux:
rg -o "\\bas any\\b" src | wc -l
# PowerShell:
(rg -o "\\bas any\\b" src | Measure-Object -Line).Lines
```

### 架构重构验证
- 每个拆分后的文件 < 300 行
- 所有现有测试继续通过
- 功能无回归

---

## 五、总结

这个项目的架构基础是**良好的**（三层架构、领域驱动设计、Result<T,E> 模式都已到位），技术债务主要来自**快速迭代**过程中的积累（RSIP、Betting、Pet 等新功能）。

**好消息**：需要的是**针对性重构**而非根本性重设计。

**建议执行顺序**：
1. 先修复测试系统（让 CI 可信赖）
2. 再处理类型安全（让重构更安全）
3. 最后架构拆分（降低维护成本）

这样可以在最小风险下逐步偿还技术债务。
