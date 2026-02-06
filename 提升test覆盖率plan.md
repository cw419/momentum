# Momentum 测试覆盖率与质量提升计划

## Context

Momentum 项目当前测试基础设施完善（Vitest + RTL + MSW + Stryker），但覆盖率分布极不均匀：domain hooks 100%，而组件层仅 7.3%，基础设施层 16%。现有测试质量高（AAA 模式、行为驱动命名、工厂模式），需要在保持质量的前提下系统性扩大覆盖范围。

当前覆盖率阈值：statements 59% / branches 50% / functions 57% / lines 60%

---

## E2E 测试评估：暂不引入

**结论：不适合当前阶段。**

- Momentum 是生产力工具，非安全关键系统，E2E 的维护成本（慢、脆弱、需要 Supabase 凭证）与收益不成比例
- Container+View 架构已允许通过 RTL 充分测试 UI 行为，无需浏览器
- 项目哲学是"保持本地迭代畅通"（无 pre-commit hooks），E2E 与此冲突
- **如果未来引入**，优先覆盖：创建链 -> 启动会话 -> 完成 -> 验证连续记录；导入/导出往返；认证流程

## BDD 评估：当前模式已足够

**结论：不需要 Cucumber/Gherkin。**

- 现有 `describe/it` 已遵循 BDD 精神（如 `it('should add a new unit chain to state')`）
- 正式 BDD 需要 `.feature` 文件 -> step definitions -> 测试代码的三层翻译，无非技术受众阅读，违反 YAGNI
- **建议**：继续当前命名模式，确保新测试用 `should [行为] when [条件]` 格式

---

## Phase 1：纯函数测试（最高 ROI，零 mock）

新建 5 个测试文件，预计覆盖率提升 +4-5%：

### 1.1 `src/utils/__tests__/petLogic.test.ts`
- 源文件：`src/utils/petLogic.ts`（245 LOC，纯函数，零依赖）
- 测试点：
  - `calculateDecay`：<1分钟跳过、hunger 递增上限100、happiness 递减下限0、hunger>80 时 health 衰减、hunger<50 时 health 恢复、边界值
  - `calculateTaskReward`：失败任务惩罚、XP 随时长缩放、hunger 减少上限20、升级检测、进化检测
  - `calculateMood`：5 个心情阈值（85/65/45/25）
  - `getStageEmoji` / `getMoodEmoji` / `getStageName`：所有枚举值 + 双语
  - `getLevelProgress`：0%、50%、100% 边界
  - `createNewPet`：默认值、唯一 ID（mock `crypto.randomUUID`）
- 新建工厂：`src/test/factories/petStateFactory.ts`

### 1.2 `src/utils/__tests__/errorMessage.test.ts`
- 源文件：`src/utils/errorMessage.ts`（182 LOC）
- 测试点：错误分类、中英文消息、PGRST/SQLSTATE 错误码提取、`toError` 各种输入类型

### 1.3 `src/utils/__tests__/stringUtils.test.ts`
- 源文件：`src/utils/stringUtils.ts`（71 LOC）
- 测试点：Levenshtein 距离（相同/空/完全不同/部分匹配）、`normalizeName`（空白/标点/中文/大小写）

### 1.4 `src/utils/__tests__/timeLimit.test.ts`
- 源文件：`src/utils/timeLimit.ts`（129 LOC）
- 测试点：`isGroupExpired`（非 group chain / 无时限 / 未开始 / 已过期 / 未过期）、`startGroupTimer`、`resetGroupProgress`、`getGroupTimeStatus` 双语

### 1.5 `src/infra/storage/supabase/__tests__/mappers.test.ts`
- 源文件：`src/infra/storage/supabase/mappers.ts`（144 LOC）
- 测试点：`mapChainRowToChain`（unit/group 映射、null 字段、日期解析）、`buildChainRow`（NaN 清理、无效日期、自引用 parentId）
- 新建工厂：`src/test/factories/chainRowFactory.ts`

### Phase 1 完成后操作
- 覆盖率阈值提升至：statements 63 / branches 54 / functions 61 / lines 64
- Stryker 扩展 mutate 列表，新增这 5 个纯函数文件

---

## Phase 2：基础设施与重试逻辑

新建 5 个测试文件，预计覆盖率提升 +3-4%：

### 2.1 `src/infra/storage/supabase/__tests__/retry.test.ts`
- 源文件：`src/infra/storage/supabase/retry.ts`（175 LOC）
- 测试点：首次成功、重试后成功、不可重试错误码（PGRST204/42703）、最大重试耗尽、`retryWithAuth` 认证失败恢复
- 使用 `vi.useFakeTimers()` 避免真实延迟

### 2.2 `src/services/__tests__/RealTimeSyncService.test.ts`
- 源文件：`src/services/RealTimeSyncService.ts`（294 LOC）
- 测试点：发布/订阅、存储操作转发、启用/禁用切换、单例 setup/teardown
- 复用 `createLocalStorageMock()`

### 2.3 `src/infra/storage/supabase/chains/__tests__/mutations.test.ts`
- 源文件：`src/infra/storage/supabase/chains/mutations.ts`（207 LOC）
- 测试点：`saveChains` 缺列回退（`isMissingColumnError` 路径）、重复 ID 检测、upsert + 删除已移除链
- 复用 `createMockContext()` + `createMockQueryBuilder()`（来自 `testHelpers.ts`）

### 2.4 `src/infra/storage/supabase/chains/__tests__/queries.test.ts`
- 源文件：`src/infra/storage/supabase/chains/queries.ts`（135 LOC）
- 测试点：`getActiveChains` 缺 deleted_at 列回退、PGRST116 错误处理、空结果

### 2.5 `src/utils/__tests__/notifications.test.ts`
- 源文件：`src/utils/notifications.ts`（216 LOC）
- 测试点：权限请求、通知创建、权限被拒绝处理
- 需 mock `window.Notification`

### Phase 2 完成后操作
- 覆盖率阈值提升至：statements 67 / branches 58 / functions 65 / lines 68
- Stryker 新增 `retry.ts` 和 `src/utils/async-operation-manager/retry.ts`

---

## Phase 3：服务层 + 关键组件

### 3.1 服务层补全（4 个文件）
- `src/services/__tests__/RuleStateManager.test.ts`（104 LOC）
- `src/services/__tests__/UserFeedbackHandler.test.ts`（117 LOC）
- `src/infra/storage/supabase/__tests__/auth.test.ts`（81 LOC）
- `src/infra/storage/supabase/__tests__/SupabaseStorage.test.ts`（288 LOC，重点测试 `deduplicatedRequest` 并发去重机制）

### 3.2 组件测试策略（三桶分类）

**Bucket A - RTL 完整测试（~8 个 Container 组件）：**
- `AppShellContainer.tsx` - 根编排器，测试 `currentView` 路由
- `FocusModeContainer.tsx` - 计时器行为、暂停/恢复、完成流程
- `ChainEditorContainer.tsx` - 创建 vs 编辑模式、验证、保存
- `ChainCardContainer.tsx` - 点击处理、删除确认
- `RecycleBinModalContainer.tsx` - 恢复/永久删除
- `BettingModalContainer.tsx` - 投注流程 + 积分验证
- `GroupViewContainer.tsx` - 时限逻辑
- `ImportExportModalContainer.tsx` - 文件处理、验证

**Bucket B - 冒烟测试（~20 个 View 组件）：** 仅验证"渲染不崩溃"

**Bucket C - 跳过（~140+ 纯展示组件）：** 无逻辑的 JSX+CSS 组件，测试零价值

### Phase 3 完成后操作
- 覆盖率阈值提升至：statements 70 / branches 62 / functions 68 / lines 71

---

## Phase 4：Mutation Testing 扩展

修改 `stryker.config.mjs`：

**Phase 1 后新增：**
```
'src/utils/petLogic.ts',
'src/utils/errorMessage.ts',
'src/utils/stringUtils.ts',
'src/utils/timeLimit.ts',
'src/infra/storage/supabase/mappers.ts',
```

**Phase 2 后新增：**
```
'src/infra/storage/supabase/retry.ts',
```

**不加入 Stryker 的文件：** 组件文件和 Supabase query/mutation 文件（async mock 导致 mutation testing 慢且不稳定）

**阈值调整：** Phase 2 后将 `thresholds.break` 从 60 提升至 70

---

## Phase 5：长期维护

- 长期覆盖率目标：75/65/72/75（不追求 80%+，193 个组件文件的边际收益递减）
- 新功能开发时同步编写测试（通过 code review 而非自动化强制）
- 定期运行 `npm run quality:knip` 清理死代码（降低覆盖率分母）
- 低优先级文件（`logger.ts`、`performanceLogger.ts`、`reactPerformanceMonitor.ts`）仅在修改时补测试

---

## 需新建的测试工厂

| 工厂文件 | 用途 |
|---------|------|
| `src/test/factories/petStateFactory.ts` | Phase 1 petLogic 测试 |
| `src/test/factories/chainRowFactory.ts` | Phase 1 mappers 测试 |

复用现有工厂：`storageMock.ts`、`chainFactory.ts`、`appStateFactory.ts`
复用现有 helper：`testHelpers.ts`（`createMockContext`、`createMockQueryBuilder`）

---

## 验证方式

每个 Phase 完成后：
1. `npm test` - 确认所有 smoke tests 通过
2. `npm run test:coverage` - 确认覆盖率达到新阈值
3. `npm run test:mutation` - 确认 mutation score 不低于 break 阈值
4. `npm run typecheck` - 确认无类型错误
