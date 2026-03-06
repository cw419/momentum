# Momentum 静态分析治理重整方案 v2（fact-checked）

> **v2 变更说明**: 本版基于 v1 方案，经三轮实测验证后修正数据偏差、补充遗漏项、细化实施分期。
> 勘误对照见 [§ Corrigendum](#corrigendum)。

---

## Corrigendum

v1 方案每项声明 vs 2026-03-06 实测结果对照：

| # | v1 断言 | 实测结果 | 偏差等级 | 说明 |
|---|---------|---------|----------|------|
| 1 | knip 21 条 | knip 21 条（7 values + 14 types） | **无偏差** | 数量吻合；但 21 条中绝大多数为 barrel index 再导出（migration/, cache/）和跨文件类型重复计入，真正「死代码」集中在 RSIP insight 类型和 migration barrel |
| 2 | ts-prune 25 条 | 原始输出 ~25 条，其中绝大多数标记 `(used in module)` 为假阳性 | **中度偏差** | v1 未说明假阳性比例；真实未使用导出与 knip 重叠，ts-prune 独立增量价值极低 |
| 3 | sonar 29 条 | 29 条（void-use 18、no-nested-functions 3、no-nested-conditional 3、cognitive-complexity 2、no-unused-vars 2、todo-tag 1） | **无偏差** | v1 未给出规则分布，v2 补充 |
| 4 | large-file-budget 30 个超限文件 | 30 个 | **无偏差** | 已确认 |
| 5 | quality:test:audit 1 条错误 | test-lint-budget.json 显示 warnings: 0, errors: 0 | **轻度偏差** | 报告本身为 0 error，但 **报告已过期 26 天**（generatedAt: 2026-02-08），结果不可信 |
| 6 | jscpd 未提及超限 | **10 clones > max 6**；0.30% 恰好踩线 ≤0.30% | **重要遗漏** | debt-gate 在 jscpd clone 数上必定 FAIL，v1 完全未提及 |
| 7 | quality:ci:info && 串联短路 | 已确认：package.json line 42 用 `&&` 串联 11 个子命令 | **无偏差** | |
| 8 | debt-gate 读旧 artifact | 已确认：`reports/jscpd/` 未被 .gitignore 排除 | **无偏差** | |
| 9 | lint、typecheck、test、build、quality:type-coverage 均过 | 已确认 | **无偏差** | |
| 10 | madge 循环依赖为 0 | 已确认 | **无偏差** | |
| 11 | depcheck 为 0 | 已确认 | **无偏差** | |

---

## Summary

- **当前状态评估：`中度，约 5.5/10`**。不是塌方型屎山——`lint`、`typecheck`、`test`、`build`、`quality:type-coverage` 都能过，`madge` 循环依赖为 0；但治理链路已经失真，且 jscpd 已硬性超限。
- **v1 → v2 评分调整**（6/10 → 5.5/10）：knip 21 条虽数量不变但大部分是 barrel 再导出而非散落死码；ts-prune 独立增量价值极低；实际债务热点更集中（RSIP + pet widget + session domain），不是全仓平均失控。但 jscpd **10 > 6** 这一硬门失败使得评分不能降太多。
- **失真证据已坐实**：`quality:ci:info` 在 [package.json](./package.json) line 42 用 `&&` 串行 11 个子命令，首个失败即短路后续全部跳过；[debt-gate.mjs](./tools/quality/debt-gate.mjs) 读取已提交的 `jscpd-report.json`（`reports/jscpd/` 未被 `.gitignore` 排除），会被旧 artifact 误导。
- **当前真实债务**：
  - `knip` 21 条（7 unused values + 14 unused types），集中在 barrel index 再导出（migration/、cache/）和 RSIP insight 类型
  - `ts-prune` 原始输出 ~25 条，绝大多数 `(used in module)` 假阳性，与 knip 重叠
  - `sonarjs` 29 条（void-use 18、no-nested-functions 3、no-nested-conditional 3、cognitive-complexity 2、no-unused-vars 2、todo-tag 1）
  - `jscpd` **10 clones > max 6，0.30% 恰好踩线** — 这是当前唯一硬门 FAIL
  - `large-file-budget` 30 个超限文件（budget 15），热点 RSIPView.tsx(879)、useRsipDomain.ts(756)、rsip.ts(718)
  - `test-lint-budget.json` 已过期 26 天（2026-02-08 → 今日 2026-03-06），结果不可信
  - `depcheck` 为 0（干净）
  - `quality:circular` 为 0（干净）
- 推荐方向不是"再堆工具"，而是 **"修编排、去重叠、降 jscpd、做 ratchet"**。

---

## Key Changes

### 1. 用 soft-lane runner 替代 `&&` 串联

用一个 Node 版 `soft-lane-runner.mjs` 替代 `quality:ci:info` 的 `&&` 串联，单次运行必须跑完全部 soft checks。

**`soft-lane-runner.mjs` 设计规格：**

```
位置：tools/quality/soft-lane-runner.mjs
输入：子命令列表（硬编码或读 package.json scripts）
输出：
  - stdout: 每项 check 的 name / exit code / 耗时 / 报告路径 / stale 标记
  - reports/quality/soft-summary.json — 机器可读汇总
  - reports/quality/soft-summary.md — 人类可读汇总
退出码约定：
  - quality:ci:soft     → 永远 exit 0（纯汇报）
  - quality:ci:soft:strict → 按配置决定 exit code（某些项 fail 可返非 0）
```

**检查清单**（保持与现有 `quality:ci:info` 一致）：

1. `quality:knip`
2. `quality:ts-prune`（过渡期保留，Phase 2 移除）
3. `quality:depcheck`（过渡期保留，Phase 3 降到 nightly）
4. `quality:circular`
5. `quality:jscpd`
6. `quality:debt-gate`
7. `quality:sonar:report`
8. `security:semgrep`
9. `security:npm-audit`
10. `lint:sql`
11. `quality:test:audit`

**关键约束**：脚本名 `quality:ci:info` 保持不变——改内部实现（从 `&&` 串联改为调用 `soft-lane-runner.mjs`），不改脚本名，避免触发 `repo-governance.test.ts`（line 90: `expect(commands).toEqual(['quality:ci:info', 'quality:ci:required'])`) 需要修改。

### 2. 绑死"报告生成"和"报告消费"

- `quality:debt-gate`（`debt-gate.mjs`）自己先生成 fresh `jscpd` 报告，或校验 `generatedAt` + `git SHA`。
- 所有依赖 `reports/` 的脚本都改成"先生成、再判断"，不信任仓库里已有产物。
- **将 `reports/jscpd/` 加入 `.gitignore`**，杜绝旧 artifact 被提交。

### 3. 重新分层工具链

| 层级 | 包含项 | 退出码 |
|------|--------|--------|
| **Required**（硬门） | `format:check`, `lint`, `lint:css`, `lint:md`, `lint:spell`, `lint:spell:docs`, `typecheck`, `quality:type-coverage`, `test:coverage`, `build`, `quality:circular` | 非 0 即 block |
| **PR soft**（信息门） | `knip`, `quality:sonar:report`, fresh `jscpd` + `debt-gate`, `large-file-budget`, `quality:test:audit` | 永远 exit 0，仅出报告 |
| **Nightly/On-demand** | `semgrep`, `npm-audit`, `lint:sql`, mutation/coverage hotspots, license 检查 | 定时或按需 |

### 4. 明确主次，减少重复噪声

- `knip` 作为 unused exports/files/deps 的**唯一主口径**。
- `ts-prune` 从 CI soft lane 移除，保留为一次性迁移辅助工具。（原始输出假阳性率极高，独立增量价值不足以证明 CI 开销）
- `depcheck` 当前为 0 且与 `knip` 重叠，降到 nightly 或退休。

### 5. 把常红门改成 ratchet

- `large-file-budget`：先改为"不允许新增 >300 行文件 / 不允许现有 Top offenders 继续膨胀"，等第一轮拆分后再收回绝对阈值。
- `sonarjs`：先冻结 29 条为基线，优先清 `void-use`（18 条）、`cognitive-complexity`（2 条）、`no-nested-functions`（3 条）。
- `knip`：优先清 barrel index 再导出（`migration/index`、`utils/cache/index`）、RSIP insight 类型、import/export 重复类型。

---

## jscpd Clone 热点分析及修复策略

当前 **10 clones**（budget 6），需削减至少 4 个 clone block：

### 热点 1：`src/infra/storage/supabase/rsip.ts` — 4 clones

**问题**：lines 341-365 / 407-431 / 489-513 / 560-584 / 637-661 存在大量结构相同的 Supabase query 模式（每段 24 行、225 tokens）。

**修复策略**：提取通用 Supabase query builder helper，用参数化消除重复模式。例如：

```typescript
// 提取为泛型 helper
async function queryRsipData<T>(
  supabase: SupabaseClient,
  tableName: string,
  filters: Record<string, unknown>,
  select: string
): Promise<T[]> { ... }
```

**预期收益**：消除 4 个 clone blocks → 剩余 6（恰好达标）

### 热点 2：`src/components/pet/widget/hooks/usePetWidgetController.ts` — 4 clones

**问题**：
- lines 130-151 vs 164-185（21 行）：相似的状态更新逻辑
- lines 185-211 vs 211-237（26 行）：重复的动画/过渡处理
- 文件总体 31.76% 为重复代码

**修复策略**：提取共享的状态更新函数和动画处理 hook。

**预期收益**：消除 2-4 个 clone blocks

### 热点 3：其他散点 clone（各 1 个）

| 文件对 | 行数 | 策略 |
|--------|------|------|
| `DurationSection.tsx` vs `AuxiliaryChainSettingsSection.tsx` | 17 行 | 提取共享 duration 组件 |
| `RSIPCanvasView.tsx` vs `RSIPTree.tsx` | 14 行 | 提取共享 RSIP 渲染 util |
| `app-shell/types.ts` vs `usePetDomain.ts` | 12 行 | 统一类型定义到一处 |
| `Dashboard.tsx` vs `ImportExportModalContainer.tsx` | 15 行 | 提取共享 UI pattern |

### 修复优先级

**Phase 1 目标**：将 10 → ≤6（达标）。最高 ROI 是修 `rsip.ts`（4 clones，修 1 个文件即可达标）。

---

## sonarjs 29 条规则分布

| 规则 | 数量 | 占比 | 优先级 | 修复难度 |
|------|------|------|--------|----------|
| `void-use` | 18 | 62% | P1 | 低（加 `await` 或显式忽略） |
| `no-nested-functions` | 3 | 10% | P2 | 中（提取为独立函数） |
| `no-nested-conditional` | 3 | 10% | P2 | 中（early return 或提取） |
| `cognitive-complexity` | 2 | 7% | P1 | 中（拆分复杂函数） |
| `no-unused-vars` | 2 | 7% | P3 | 低（删除或 `_` 前缀） |
| `todo-tag` | 1 | 3% | P3 | 低（清理或转 issue） |

**推荐清理顺序**：先清 `void-use`（18 条，批量 sed 可解决大半）→ `cognitive-complexity`（2 条，质量提升明显）→ 其余。

---

## 陈旧报告清理

### 问题

1. `reports/jscpd/` 未被 `.gitignore` 排除 → 旧 `jscpd-report.json` 可能被提交，误导 `debt-gate.mjs`
2. `test-lint-budget.json` 已过期 26 天（generatedAt: 2026-02-08）→ 结果不可信

### 修复

1. 在 `.gitignore` 中添加 `reports/jscpd/`
2. 所有 `reports/` 子目录统一排除（确认现有条目 + 补充缺失）：
   ```gitignore
   # Quality report outputs (generated, never commit)
   reports/
   ```
   或更保守地逐项添加：
   ```gitignore
   reports/jscpd/
   ```
3. 已提交的旧报告从 tracking 中移除：`git rm --cached -r reports/jscpd/`

---

## 实施分期

### Phase 1: 修编排 + 降 jscpd（消除硬门 FAIL）

**目标**：`quality:debt-gate` 从 FAIL → PASS

**涉及文件**：
- `tools/quality/soft-lane-runner.mjs`（新建）
- `package.json`（`quality:ci:info` 内部实现改为调用 runner）
- `.gitignore`（添加 `reports/jscpd/`）
- `tools/quality/debt-gate.mjs`（添加 fresh report 生成/校验逻辑）
- `src/infra/storage/supabase/rsip.ts`（消除 4 jscpd clones）

**验证方式**：
1. `npm run quality:jscpd && npm run quality:debt-gate` 应 PASS（clones ≤ 6）
2. 删除 `reports/jscpd/jscpd-report.json` 后重跑 `quality:debt-gate`，确认能自动再生成
3. `npm run quality:ci:info` 跑完全部 11 项，不因某项失败而短路
4. `npx vitest run src/__tests__/repo-governance.test.ts` 应 PASS（脚本名未改）

### Phase 2: 去重叠 + 清 sonarjs

**目标**：`ts-prune` 退出 CI soft lane；sonarjs 基线降至 ≤20

**涉及文件**：
- `package.json`（从 `quality:ci:info` / soft-lane 配置中移除 `ts-prune`）
- `tools/quality/soft-lane-runner.mjs`（更新检查清单）
- sonarjs `void-use` 涉及的 ~18 个文件（加 `await` 或显式处理）
- sonarjs `cognitive-complexity` 涉及的 2 个文件（拆分）

**验证方式**：
1. `npm run quality:sonar:report` 产出 ≤ 20 条
2. `npm run lint` 仍 PASS
3. `npm run quality:ci:info` 仍跑完全套（ts-prune 已移除但其余不变）

### Phase 3: ratchet + 收尾

**目标**：建立持续约束机制，防止回弹

**涉及文件**：
- `tools/quality/debt-gate.mjs`（添加 ratchet 配置：读当前基线 → 只允许 ≤ 基线值）
- `tools/quality/large-file-ratchet.mjs`（新建，替代绝对阈值）
- `package.json`（`depcheck` 降为 nightly）
- knip barrel re-export 涉及的 `src/services/migration/index.ts`、`src/utils/cache/index.ts`

**验证方式**：
1. knip 条数 ≤ 原基线（21 或更低）
2. 人为新增 >300 行文件时 ratchet 拒绝
3. `npm run quality:ci:nightly` 全链路跑通

---

## Test Plan

1. **short-circuit 修复验证**：运行新 `quality:ci:info`（内部走 `soft-lane-runner.mjs`），即使 `knip` 失败，也要确认 `sonar`、`jscpd`、`large-file-budget`、`test:audit` 仍全部执行并进入汇总。
2. **旧报告免疫**：删除或污染旧 `reports/jscpd/jscpd-report.json` 后再跑 `quality:debt-gate`，确认不会再出现"旧报告误过门禁"。
3. **对比一致性**：soft lane summary 与单项命令结果对比，确认失败数、耗时、报告路径一致。
4. **硬门不变**：`lint`、`typecheck`、`build`、测试 smoke、`quality:circular` 的 exit code 仍直接反映真实状态。
5. **repo-governance 不变**：`npx vitest run src/__tests__/repo-governance.test.ts` PASS — 脚本名 `quality:ci:info` / `quality:ci:required` / `quality:ci:nightly` 均未改。
6. **债务清理验收**（Phase 1 完成后）：
   - `quality:debt-gate` PASS（jscpd clones ≤ 6）
   - `test-lint-budget.json` 刷新为最新 generatedAt
   - soft-summary.json 生成且无 stale 标记

---

## Assumptions

- 按"平衡分层、仓库内自给"原则，不依赖 GitHub Code Scanning 或 SARIF 平台能力。
- 不建议现在再叠加 `Biome`、`Oxlint` 或更多 SaaS smell 工具；当前瓶颈是 orchestration 和基线漂移，不是工具数量不够。
- 本次已实测通过的是 `lint`、`typecheck`、`test`、`build`、`quality:type-coverage`、`quality:circular`；未端到端重验 `quality:ci:required` 的全部子项。
- 实施不需要修改 `ci.yml` 中的 job 结构（仍调用 `quality:ci:required` + `quality:ci:info`），只改 package.json 脚本内部实现。

---

## 附录：当前 debt-gate 指标快照（2026-03-06）

| 指标 | 当前值 | 预算 | 状态 |
|------|--------|------|------|
| `as unknown as` 类型断言 | 14 | ≤30 | PASS |
| `as Error` 类型断言 | 0 | ≤10 | PASS |
| 非空断言 (`!`) | 36 | ≤70 | PASS |
| jscpd clone blocks | **10** | **≤6** | **FAIL** |
| jscpd 重复百分比 | 0.30% | ≤0.30% | PASS（踩线） |
| 循环依赖 | 0 | 0 | PASS |
| type coverage | ≥95% | ≥95% | PASS |
| depcheck | 0 | 0 | PASS |
