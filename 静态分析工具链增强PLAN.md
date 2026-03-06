# Momentum 静态分析治理重整方案（含当前屎山评估）

## Summary
- 当前状态评估：`中度偏重，约 6/10`。不是塌方型屎山，因为 `lint`、`typecheck`、`test`、`build`、`quality:type-coverage` 都能过，`madge` 循环依赖为 0；但治理链路已经失真。
- 失真证据已经坐实：`quality:ci:info` 在 [package.json](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/package.json) 里用 `&&` 串行，首个失败即短路；[debt-gate.mjs](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/tools/quality/debt-gate.mjs) 读取现成 `jscpd-report.json`，会被旧 artifact 误导。
- 当前真实债务：`knip` 21 条，`ts-prune` 25 条，`sonar` 29 条，`large-file-budget` 30 个超限文件，`quality:test:audit` 1 条错误；热点集中在 RSIP、import/export、session domain、app shell，不是全仓平均失控。
- 推荐方向不是“再堆工具”，而是“修编排、去重叠、做 ratchet”。现有工具已经够多，问题在于口径不统一、报告不新鲜、常红规则没有分层。

## Key Changes
- 用一个 Node 版 soft-lane runner 替代 `quality:ci:info` 的 `&&` 串联，单次运行必须跑完全部 soft checks，并生成 `reports/quality/summary.json` 和 `summary.md`，汇总每项 exit code、耗时、报告路径、是否 stale。
- 新增两个脚本接口：
  - `quality:ci:soft`：永远跑完全套 soft checks，固定 exit 0，只负责出报告。
  - `quality:ci:soft:strict`：同样全量执行，但按配置决定是否因 soft failure 返回非 0。
- 把“报告生成”和“报告消费”绑死：
  - `quality:debt-gate` 自己先生成 fresh `jscpd` 报告，或校验 `generatedAt + git SHA`。
  - 所有依赖 `reports/` 的脚本都改成“先生成、再判断”，不要信任仓库里已有产物。
- 重新分层工具链：
  - `Required`：保留现有 `lint`、`typecheck`、`build`、测试 smoke、`quality:type-coverage`，并把 `quality:circular` 升为硬门。
  - `PR soft`：`knip`、`quality:sonar:report`、fresh `jscpd`、`large-file-budget`、`quality:test:audit`。
  - `Nightly/On-demand`：`semgrep`、`npm-audit`、`lint:sql`、mutation/coverage hotspots、license 检查。
- 明确主次，减少重复噪声：
  - `knip` 作为 unused exports/files/deps 的唯一主口径。
  - `ts-prune` 从 CI soft lane 移除，保留为一次性迁移辅助。
  - `depcheck` 既然当前为 0 且与 `knip` 重叠，降到 nightly 或退休。
- 把常红门改成 ratchet：
  - `large-file-budget` 先改为“不允许新增 >300 行文件 / 不允许现有 Top offenders 继续膨胀”，等第一轮拆分后再收回绝对阈值。
  - `sonarjs` 先冻结 29 条为基线，优先清 `void-use`、`cognitive-complexity`、`no-nested-*`。
  - `knip` 第一批优先清 `migration/index`、`utils/cache/index`、import/export 类型、RSIP insight 类型。

## Test Plan
- 运行新 `quality:ci:soft`，即使 `knip` 失败，也要确认 `sonar`、`jscpd`、`large-file-budget`、`test:audit` 仍全部执行并进入汇总。
- 删除或污染旧 `reports/jscpd/jscpd-report.json` 后再跑 `quality:debt-gate`，确认不会再出现“旧报告误过门禁”。
- 对比 soft lane summary 与单项命令结果，确认失败数、耗时、报告路径一致。
- 验证迁移后硬门行为不变：`lint`、`typecheck`、`build`、测试 smoke、`quality:circular` 的 exit code 仍直接反映真实状态。
- 债务清理后的首轮验收目标：`knip` 接近清零，`quality:test:audit` 清掉那 1 条 `vitest/no-conditional-tests`，`large-file-budget` 改成 ratchet 后 PR 不再永久红。

## Assumptions
- 按你的选择，方案默认“平衡分层、仓库内自给”，不依赖 GitHub Code Scanning 或 SARIF 平台能力。
- 不建议现在再叠加 `Biome`、`Oxlint` 或更多 SaaS smell 工具；当前瓶颈是 orchestration 和基线漂移，不是工具数量不够。
- 本次已实测通过的是 `lint`、`typecheck`、`test`、`build`、`quality:type-coverage`、`quality:circular`；未端到端重验 `quality:ci:required` 的全部子项。
