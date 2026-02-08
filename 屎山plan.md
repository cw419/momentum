# Momentum 项目「屎山程度」评估与优化/重构 Plan（Fact-Checked v2）

> 更新时间：**2026-02-08**  
> 评估结论：**不是屎山**；属于“代码卫生强、结构债集中”的项目。  
> 建议执行策略：先控风险（P0），再抽领域（P1），最后瘦工具链（P2）。

---

## 1. 本次 Fact Check（实跑命令与结果）

### 1.1 核心静态分析

| 类别 | 命令 | 结果 |
|---|---|---|
| TypeScript 类型检查 | `npm run typecheck` | ✅ 通过 |
| ESLint（主规则） | `npm run lint` | ✅ 通过（0 error / 0 warning） |
| Type Coverage | `npm run quality:type-coverage` | ✅ **99.77%**（`65844 / 65995`） |
| 重复代码 | `npm run quality:jscpd` | ✅ **0.07%**（3 clones, 43 duplicated lines） |
| 循环依赖 | `npm run quality:circular` | ✅ 0 circular deps |
| 未使用文件/导出/依赖 | `npm run quality:knip` | ✅ 0 |
| 未使用导出 | `npm run quality:ts-prune` | ✅ 0 |
| 依赖卫生 | `npm run quality:depcheck` | ✅ No depcheck issue |
| SonarJS 异味 | `npm run quality:sonar:report` | ✅ 509 files, 0 messages |
| 债务门禁 | `npm run quality:debt-gate` | ✅ PASSED（NNA=34, clones=3） |

### 1.2 补充质量/安全检查

| 类别 | 命令 | 结果 |
|---|---|---|
| 测试质量审计 | `npm run quality:test:audit` | ⚠️ **112 warnings / 0 errors**（测试代码专项 lint） |
| CSS 规范 | `npm run lint:css` | ✅ 通过 |
| Markdown 规范 | `npm run lint:md` | ✅ 53 files, 0 error |
| 拼写（代码） | `npm run lint:spell` | ✅ 697 files, 0 issue |
| 拼写（文档） | `npm run lint:spell:docs` | ✅ 53 files, 0 issue |
| npm 漏洞 | `npm run security:npm-audit` | ✅ 0 vulnerabilities |
| Semgrep 安全规则 | `npm run security:semgrep` | ✅ 897 files, 0 findings |

---

## 2. 对旧评估文档的纠偏（Fact Check 差异）

| 项目 | 旧版值 | 本次复核 | 结论 |
|---|---:|---:|---|
| 源码总行数（非测试） | 51,922 | **53,795** | 旧值过期 |
| 测试代码总行数 | 40,506 | **40,681** | 小幅变化 |
| 源文件数（非测试） | ~530 | **523** | 旧值近似可用，但不精确 |
| 测试文件数 | 175 | **175** | 正确 |
| type coverage | 99.90% | **99.77%** | 旧值过期 |
| 大文件数（>300 行） | 20（含生成） | **26**（含生成） | 旧值过期 |
| 大文件数（排除 `database.types.ts`） | 19 | **25** | 旧值过期 |
| 主 lint 结论 | 零违规 | **零违规** | 正确 |
| “测试质量无明显问题” | 未明确 | **112 warnings** | 需补充风险 |
| “行业前 10%” | 定性断言 | 无本地基准数据支撑 | 建议删除该断言 |

---

## 3. 当前结构健康画像（基于复核数据）

### 3.1 代码分布（非测试）

总计：**53,795 行 / 523 文件**

| 目录 | 文件数 | 行数 | 占比 |
|---|---:|---:|---:|
| `src/components/` | 194 | 22,271 | 41.4% |
| `src/services/` | 99 | 11,252 | 20.9% |
| `src/utils/` | 130 | 8,658 | 16.1% |
| `src/hooks/` | 18 | 3,512 | 6.5% |
| `src/infra/` | 23 | 2,944 | 5.5% |
| `src/app/` | 12 | 1,601 | 3.0% |
| `src/types/` | 11 | 739 | 1.4% |
| `src/storage/` | 5 | 340 | 0.6% |
| `src/i18n/` | 5 | 212 | 0.4% |
| `src/domain/` | 6 | 125 | 0.2% |

### 3.2 大文件风险（>300 行）

- **26 个**文件超 300 行（排除自动生成后仍有 **25 个**）
- 按层分布：`components` 14、`hooks` 3、`services` 3、`app` 2、`utils` 2、`infra` 1
- >350 行高优先级文件：**9 个**（`useExceptionRuleFlow.ts`、`ImportExportModalParts.tsx`、`Dashboard.tsx`、`useBettingModal.ts`、`hooks/domains/sessions/start.ts` 等）

### 3.3 并行子系统冗余（仍存在）

已复核存在以下“同职责多套实现”迹象：

- 缓存：`CacheCore` + `ExceptionRuleCache` + `RuleSearchCache` + `chainTreeCache`
- 性能监控：`PerformanceMonitor` + `reactPerformanceMonitor` + `LayoutStabilityMonitor` + `performanceLogger`
- 迁移：`MigrationHelper` + `DataMigrationManager` + `ExceptionRuleMigration` + `MigrationExecutor`
- 规则管理：`RuleStateManager` + `RuleScopeManager` + `RuleUsageTracker` + `RuleClassificationService` + `RuleSearchOptimizer`
- 错误处理：`ErrorClassificationService` + `ErrorRecoveryManager` + `ErrorMessageFormatter` + `UserFeedbackHandler`

---

## 4. 屎山指数（v2）

### 4.1 量化评分（10 分制）

| 维度 | 分数 | 权重 | 加权分 |
|---|---:|---:|---:|
| 代码重复（jscpd） | 10 | 10% | 1.00 |
| 循环依赖（madge） | 10 | 10% | 1.00 |
| 类型安全（type-coverage） | 9 | 10% | 0.90 |
| 主 lint 合规 | 10 | 10% | 1.00 |
| 死代码（knip/ts-prune） | 10 | 5% | 0.50 |
| 文件尺寸治理 | 5 | 15% | 0.75 |
| 架构分层健康 | 6 | 15% | 0.90 |
| 测试质量（含 test-lint） | 6 | 10% | 0.60 |
| 工程化适度性 | 5 | 15% | 0.75 |
| **总分** |  | **100%** | **7.40 / 10** |

### 4.2 判定

```text
屎山指数：2.6 / 10
评级：轻度技术债（非屎山）
```

核心问题不是“烂代码”，而是：

1. 结构债集中在大文件与领域建模不足；
2. 质量工具链覆盖很强，但测试代码规范与架构收敛还没跟上。

---

## 5. 优化/重构计划（改进版）

## P0（1-2 周）先降风险：把“可失控点”收住

### P0-1 大文件治理门禁化

- 目标：把 >300 行文件从 25 压到 ≤15（先处理 >350 行的 9 个）
- 动作：
  - 对 9 个 >350 行文件做拆分（Container/View、hook 副作用分离、纯函数下沉）
  - 在 CI 加“文件行数预算”检查（排除 `src/lib/database.types.ts`）
- 验收：
  - `>300` 非生成文件数 ≤15
  - `npm run lint && npm run typecheck && npm test` 全绿

### P0-2 测试代码规范债清理

- 目标：`quality:test:lint` 从 112 warnings 降到 ≤20
- 动作：
  - 先清三类高频规则：
    - `testing-library/no-node-access`（74）
    - `vitest/prefer-to-have-length`（16）
    - `testing-library/no-unnecessary-act`（10）
  - 新增规则预算：warning 不允许回升
- 验收：
  - `npm run quality:test:audit` warning ≤20，error=0

### P0-3 建立“领域抽取”最小试点

- 目标：验证从 `utils/services` 到 `domain` 的迁移路径可行
- 动作：
  - 先迁一个完整闭环（建议 `pet` 或 `scheduling`）
  - 将跨层依赖固定为：`UI -> hooks -> services -> storage/domain`
- 验收：
  - `src/domain/` 行数从 125 提升到 ≥250
  - 迁移模块行为测试与回归测试通过

## P1（3-6 周）再做结构收敛：减少并行子系统

### P1-1 统一缓存与性能监控抽象

- 目标：同职责类数量减少，减少维护分叉
- 动作：
  - 缓存统一到 `CacheCore` 抽象（其余降级为实例化策略）
  - 性能监控统一到 `PerformanceMonitor` 主入口，其他模块变 adapter/plugin
- 验收：
  - 缓存/监控“对外入口”各保留 1 个主入口
  - 对应回归测试全部通过

### P1-2 统一迁移体系

- 目标：合并迁移链路，降低迁移代码认知负担
- 动作：
  - 收敛 `MigrationHelper` / `DataMigrationManager` / `MigrationExecutor`
  - `ExceptionRuleMigration` 仅作为步骤注册，不再单独编排
- 验收：
  - 迁移流程只有一条主链路
  - 迁移相关测试全通过

### P1-3 用“热点清单”补测试深度

- 目标：提升高风险文件的变更抗性
- 依据：
  - mutation score：84.4（可接受但有改进空间）
  - 低分热点：`hooks/domains/sessions/scheduling.ts`、`useChainsDomain.ts`、`chain-tree/*`
- 验收：
  - mutation score ≥88
  - `reports/quality/test-mutation-hotspots.json` 前 10 热点平均分显著提升

## P2（6-10 周）最后做工程化瘦身

### P2-1 工具链减负

- 目标：降低工具维护复杂度，不牺牲质量门禁
- 动作：
  - 合并可兼容配置：`eslint.sonar.config.js`、`vitest.ci.config.ts`、`tsconfig.ts-prune.json`（在不破坏现有门禁的前提下）
  - 脚本聚合：把高频组合命令固化为少量入口脚本
- 验收：
  - `npm scripts` 从 46 减到 ≤38
  - 关键质量命令仍可一键跑完

### P2-2 非核心资产清理

- 动作：
  - 审查 `tools/experiments/` 临时代码，归档或删除
  - 文档按“长期维护/历史归档”分层
- 验收：
  - 非生产关键目录体积与噪音显著下降
  - 新成员上手路径更短

---

## 6. 执行顺序（建议）

1. **第 1 周：** P0-1 + P0-2（先把大文件和测试 warning 压下去）
2. **第 2 周：** P0-3（做 1 个领域迁移试点）
3. **第 3-6 周：** P1-1/P1-2/P1-3（结构收敛 + 热点补测）
4. **第 7-10 周：** P2（工具链与仓库瘦身）

---

## 7. 统一验收命令（Windows 可直接执行）

```powershell
# 主质量门禁
npm run lint
npm run typecheck
npm run quality:type-coverage
npm run quality:jscpd
npm run quality:circular
npm run quality:knip
npm run quality:ts-prune
npm run quality:depcheck
npm run quality:sonar:report
npm run quality:debt-gate

# 测试质量与安全
npm run quality:test:audit
npm run security:npm-audit
npm run security:semgrep
```

```powershell
# >300 行文件检查（排除测试与自动生成）
Get-ChildItem src -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx |
  Where-Object {
    $_.FullName -notmatch '__tests__' -and
    $_.Name -notmatch '\.(test|spec)\.' -and
    $_.Name -ne 'database.types.ts'
  } |
  ForEach-Object {
    [PSCustomObject]@{
      Lines = (Get-Content $_.FullName).Count
      File  = $_.FullName
    }
  } |
  Where-Object { $_.Lines -gt 300 } |
  Sort-Object Lines -Descending
```

---

## 8. 一句话总结

> Momentum 目前不是“屎山”，而是“质量门禁做得很好，但结构债需要系统清理”的项目；按本计划执行 6-10 周，可以把风险从“轻度技术债”进一步压到“可长期演进”状态。

