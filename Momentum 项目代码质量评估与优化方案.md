# Momentum 项目代码质量评估与优化方案（可落地版：逐周抬阈值）

> 更新时间：2026-02-01  
> 目标：在不牺牲开发效率的前提下，把“质量约束”逐步落地到 CI，并做到**每周可量化变好**。

---

## 0. 结论（推荐策略）

**推荐：先不红 CI（保持 PR/主干长期为绿），但必须“硬挡回归”。**

- 现状上仓库已经存在既有技术债（例如 `madge` 检出 4 个循环依赖）。如果一上来就把所有门禁设为 hard fail，CI 会长期红，最终团队会绕过/关闭门禁，规则反而失效。
- 更可持续的方式是**两层门禁**：
  - **Hard Gate（阻断 PR）**：lint / typecheck / test:coverage（阈值）/ type-coverage（以及“禁止回退”的规则）
  - **Soft Gate（不阻断 PR）**：复杂度/重复/循环依赖/全量覆盖率等报告，先持续可见、再逐步转硬

---

## 1. 当前基线（2026-02-01，可复现）

### 1.1 CI 覆盖率口径（`npm run test:coverage`，使用 `vitest.ci.config.ts`）

> 这是 GitHub Actions 当前跑的覆盖率口径：`vitest run --coverage --config vitest.ci.config.ts`

| 指标 | 当前值 |
|------|--------|
| Statements | 59.66%（4255/7131） |
| Branches | 50.48%（2091/4142） |
| Functions | 57.56%（1039/1805） |
| Lines | 60.58%（3980/6569） |

> 重要说明：当前覆盖率报告默认只统计“被测试触达的文件”（未开启 `coverage.all`）。例如 `src/hooks/domains` 这类未被测试触达的模块**不会出现在报告里**。所以这不是“全量覆盖率”。建议新增一个“全量覆盖率报告”用于指导优先级，但不要立刻作为 Hard Gate。

### 1.2 静态检查

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run quality:type-coverage` ✅（当前已在 `package.json` 里配置为 `--at-least 95`）

### 1.3 现存的“会导致 quality 失败”的项（先别立刻硬门禁）

- `npm run quality:circular` ❌：当前存在 4 个循环依赖（基线如下）
  1) `services/EnhancedDuplicationHandler.ts` > `services/duplication/enhanced-handler/creationHandlers.ts`
  2) `services/EnhancedDuplicationHandler.ts` > `.../creationHandlers.ts` > `.../suggestionHelpers.ts`
  3) `utils/ruleSearchOptimizer.ts` > `utils/rule-search-optimizer/scoring.ts`
  4) `utils/ruleSearchOptimizer.ts` > `utils/rule-search-optimizer/searchSuggestions.ts`

---

## 2. 工具选择（哪些“必须”，哪些“可选”）

### 2.1 已经具备（无需再 `npm install -D`）

- 覆盖率：`@vitest/coverage-v8`
- 类型覆盖率：`type-coverage`
- 依赖/质量分析：`knip`、`madge`、`depcheck`、`jscpd`

### 2.2 建议后置（先别装/不是必须）

- `tsx`：只有当你要写“可跨平台在 CI 里跑的 TS 脚本”（例如 diff coverage、生成质量仪表盘）时才需要；否则直接用 `.js/.mjs` 或现有的 `tools/quality/*.ps1` 足够。
- `markdown-table`：仅当你确定要**脚本化生成 Markdown 表格**时才需要；否则不建议为了“可能用得上”引入依赖。
- `plato`：复杂度报告不是坏事，但仓库已存在 `eslint-plugin-sonarjs` 与 `eslint.sonar.config.js`，可以先用 SonarJS 的输出做“软门禁/报告”，没必要第一周就再引入一套复杂度工具。

### 2.3 可选：本地开发体验（不影响 CI）

- `husky` + `lint-staged`：可以提高本地拦截效率，但要注意跨平台（Windows / macOS / Linux）命令一致性。建议先把规则放进 CI（统一口径），再决定是否加本地 hooks。

---

## 3. Phase 1（第 0-1 周）：把门禁放到“正确位置”，确保 CI 仍是绿

### 3.1 把覆盖率阈值放到 CI 实际使用的配置里

现状：CI 跑 `npm run test:coverage`，它使用 `vitest.ci.config.ts`。所以覆盖率阈值如果只写在 `vitest.config.ts`，**CI 不一定生效**。

建议（两选一，优先 A）：

- **A：统一配置来源**：让 `vitest.ci.config.ts` 复用/继承 `vitest.config.ts` 的 `test.coverage` 配置，避免“本地一套、CI 一套”。
- **B：只在 `vitest.ci.config.ts` 配阈值**：最小改动、最快落地。

### 3.2 先做“硬挡回退”，再做“硬变好”

第一周不追求把所有工具都变成 hard fail；只做两件事：

1) 覆盖率阈值在 CI 生效（但阈值从当前基线附近开始）  
2) `type-coverage` 加入 CI（因为它当前稳定通过，风险低）

---

## 4. 逐周抬阈值（建议滚动 8 周，可按实际速度调）

### 4.1 规则（保证“逐周变好”，同时避免 CI 长期红）

- 每周固定做一次“阈值 PR”（周一/周二都行）：只改阈值 + 附上最新覆盖率数字（或 `coverage/index.html` 截图）。
- 如果本周业务迭代导致覆盖率没上涨：**本周就不抬阈值**，但仍然要保证“不回退”。
- 任何时候不要为了过门禁而关掉覆盖率/跳过测试；门禁一旦被绕过，等于没装。

### 4.2 推荐的阈值抬升表（以当前基线为起点）

> 说明：Branches/Functions 往往比 Statements/Lines 更难提升，所以前几周可以抬得更慢。

| 周次 | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| Week 0（起点） | 59 | 50 | 57 | 60 |
| Week 1 | 60 | 50 | 58 | 61 |
| Week 2 | 61 | 51 | 59 | 62 |
| Week 3 | 62 | 51 | 60 | 63 |
| Week 4 | 63 | 52 | 60 | 64 |
| Week 5 | 64 | 53 | 61 | 65 |
| Week 6 | 65 | 54 | 62 | 66 |
| Week 7 | 66 | 54 | 63 | 67 |
| Week 8 | 67 | 55 | 64 | 68 |

> 如果 Week N 的阈值导致 CI 频繁红灯：不要硬扛。把阈值回退 0.5~1，先把“新增/变更代码必须带测试”的习惯建立起来，再继续抬。

---

## 5. 非覆盖率类质量项：先做 Soft Gate，再逐步转 Hard Gate

### 5.1 循环依赖（madge）

现状：`quality:circular` 直接 hard fail，会让 `npm run quality` 永远失败（当前 4 个循环）。

可落地路径：

1) **Week 0-1（Soft）**：CI 里运行 `madge --circular ...`，但只产出日志/报告，不阻断 PR。  
2) **Week 2-4（准 Hard）**：建立“基线清单”，PR 只要让循环依赖数量增加就 fail（允许现存 4 个先留着）。  
3) **Week 4+（Hard）**：循环依赖数量清零后，改为 hard fail（任何循环都不允许）。

### 5.2 重复代码（jscpd）

现状：仓库已配置 `.jscpd.json`（threshold=5%，且忽略 tests/coverage 等目录）。可以继续作为质量报告输出，后续再决定是否需要更严。

### 5.3 复杂度（SonarJS）

现状：`eslint-plugin-sonarjs` 已配置，且存在 `eslint.sonar.config.js` 与 `tools/quality/smell-audit.ps1`。

可落地路径：
- 先把 SonarJS 报告接入 CI 产出（Soft）。
- 当 Top N 热点文件开始下降后，再把关键规则转为 Hard（例如 cognitive complexity 超阈值直接 fail）。

---

## 6. 优先级建议（“提高覆盖率”怎么做得最省）

覆盖率要涨得稳，优先从**改动最频繁、最容易测试、回归风险最大**的区域下手：

1) `src/hooks/domains/*`：补最核心的 domain hooks 的 unit tests（这里目前没有直接测试文件）。
2) `src/infra/storage/supabase/*`：已有较多测试基础，持续补边界条件与错误分支，Branches 会涨得更明显。
3) `src/services/*`：偏业务编排，适合补“输入输出”式的单元测试。

---

## 7. 风险与缓解

- **阈值抬得过快导致 CI 红**：按 4.1 规则“本周不抬阈值”，优先确保不回退。
- **“覆盖率口径”争议**：先保持 CI 口径不变；另加一条 `coverage.all=true` 的 full 报告作为导航，不立刻 gating。
- **引入本地 hooks 后跨平台踩坑**：先 CI 统一口径，再决定是否上 `husky/lint-staged`。
