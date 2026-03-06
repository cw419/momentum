# Momentum 静态分析工具链增强计划 v3（2026-03-06 复核）

> 这版不是在 v2 上继续累加假设，而是把“已经落地的治理项”和“还没做完的剩余问题”分开。
>
> 本次 fact check 依据：
> - 直接检查 `package.json`、`tools/quality/*.mjs`、`.gitignore`、`.github/workflows/ci.yml`
> - 重新执行 `npm run quality:smell-audit`
> - 重新执行 `npm run quality:ci:info`
> - 复核时间：2026-03-06
> - 复核对应 Git SHA：`c32f9a0078fbe5e8ad9bd3a5d4d35280f6f22161`

---

## 一页结论

- v2 里最重的几条“治理链路失真”判断已经不成立：`quality:ci:info` 现在已经走 runner，不再是 `&&` 串联；`reports/jscpd/` 已被 `.gitignore` 排除；`ts-prune` 和 `depcheck` 也已经移出 info lane。
- `jscpd` 和 `quality:debt-gate:core` 当前是 **PASS**，不再是主矛盾。最新实测为 **6 clones / 0.16% duplicated lines**，刚好压线通过。
- 当前真正还在发红的点，优先级应改成：
  1. `quality:ci:info` / `quality:smell-audit` 本地仍返回非 0，和“信息型通道”语义不一致。
  2. `semgrep` / `sqlfluff` 缺少本地二进制时直接 fail，和仓库文档里的“本地可选、缺失自动跳过”不一致。
  3. `large-file-budget` 仍然是最大的真实结构性失败项，当前 **30 > 15**。
  4. `knip` 21 条、`sonarjs` 29 条仍待清理。
- 如果继续按 v2 那种顺序推进，会把时间花在已经修掉的问题上。v3 的目标应该改成：**先修信号语义和本地体验，再处理 large-file backlog，最后做 nightly 收敛。**

---

## v2 关键断言勘误

| v2 断言 | 2026-03-06 复核结果 | 结论 |
|---|---|---|
| `quality:ci:info` 仍是 `&&` 串联，首个失败会短路 | `package.json` 已改为 `node tools/quality/soft-lane-runner.mjs info`；实测 `knip` 失败后其余检查仍全部执行 | 已修复，不应再列为待办 |
| info lane 仍通过 `quality:test:audit` 聚合，存在内部短路 | info lane 已改为 leaf checks：`quality:test:lint`、`quality:test:lint-budget`、`quality:test:assertions`、`quality:test:runtime`、`quality:test:coverage-hotspots`、`quality:test:mutation-hotspots` | 已修复 |
| `ts-prune` 仍在 PR soft lane | `ts-prune` 只在 `quality:smell-audit`，不在 info lane | 已修复 |
| `depcheck` 仍在 PR soft lane | `depcheck` 只在 `quality:smell-audit`，不在 info lane | 已修复 |
| `reports/jscpd/` 未被忽略，旧 artifact 会污染门禁 | `.gitignore` 已包含 `reports/jscpd/` | 已修复 |
| `jscpd` 当前 10 clones，`quality:debt-gate` 因此 fail | 最新实测 `jscpd` 为 6 clones、0.16%；`quality:debt-gate:core` PASS。聚合脚本 `quality:debt-gate` 若失败，当前原因是 `quality:large-files` | 结论已过期 |
| `debt-gate` 读取旧报告、正常路径下不可靠 | `quality:ci:info` 与 `quality:debt-gate` 聚合脚本都会先跑 fresh `quality:jscpd`；runner 也会先删除旧报告再执行。`quality:debt-gate:core` 单独执行时仍依赖已有报告 | 风险已显著下降，但可继续硬化 |
| 主矛盾仍是 orchestration 缺陷 | orchestration 还没彻底收口，但主矛盾已经转向“lane 语义、本地可选工具行为、large-file backlog” | 优先级需要重排 |

---

## 当前真实基线

### 1. Info lane（刚复跑）

`npm run quality:ci:info` 的最新结果：

- PASS：`quality:circular`、`quality:jscpd`、`quality:debt-gate:core`、`quality:test:lint`、`quality:test:lint-budget`、`quality:test:assertions`、`quality:test:runtime`、`quality:test:coverage-hotspots`、`quality:test:mutation-hotspots`
- FAIL：`quality:knip`、`quality:large-files`、`quality:sonar:report`、`security:semgrep`、`security:npm-audit`、`lint:sql`
- 结果汇总已写入：`reports/quality/info-summary.json`
- 关键事实：虽然存在多个 FAIL，但 runner 已经把所有检查都跑完了，说明 **“不短路”这个目标已经达成**

### 2. Smell audit（刚复跑）

`npm run quality:smell-audit` 的最新结果：

- FAIL：`quality:knip`、`quality:ts-prune:strict`、`quality:sonar:report`
- PASS：`quality:depcheck`、`quality:circular`
- 结果汇总已写入：`reports/quality/smell-audit-summary.json`

### 3. 关键指标快照

| 指标 | 当前值 | 预算/说明 | 状态 |
|---|---|---|---|
| `knip` unused exports/types | 21 | 7 values + 14 types | FAIL |
| `ts-prune` strict | 25 条原始输出 | 大量 `(used in module)` 假阳性 | FAIL |
| `depcheck` | 0 | 无问题 | PASS |
| `madge` circular deps | 0 | 当前无循环依赖 | PASS |
| `sonarjs` | 29 | `void-use 18`、`no-nested-functions 3`、`no-nested-conditional 3`、`cognitive-complexity 2`、`no-unused-vars 2`、`todo-tag 1` | FAIL |
| `jscpd` clones | 6 | `<= 6` | PASS |
| `jscpd` duplicated lines | 0.16% | `<= 0.30%` | PASS |
| `as unknown as` | 10 | `<= 30` | PASS |
| `as Error` | 0 | `<= 10` | PASS |
| 非空断言 `!` | 36 | `<= 70` | PASS |
| `large-file-budget` | 30 | `<= 15` | FAIL |
| `test-lint-budget` | warnings 0 / errors 0 | fresh report | PASS |
| `npm audit` | 14 vulnerabilities | 1 low / 4 moderate / 9 high | FAIL |
| `semgrep` | 本地未安装 | 当前脚本直接 exit 1 | FAIL |
| `sqlfluff` | 本地未安装 | 当前脚本直接 exit 1 | FAIL |

### 4. large-file 热点

当前最大的结构性热点已经不是 `jscpd`，而是大文件预算：

1. `src/components/RSIPView.tsx` 879 行
2. `src/hooks/domains/useRsipDomain.ts` 756 行
3. `src/infra/storage/supabase/rsip.ts` 650 行
4. `src/services/rsip-insights/RSIPInsightsService.ts` 562 行
5. `src/components/Dashboard.tsx` 491 行
6. `src/infra/storage/supabase/SupabaseStorage.ts` 435 行
7. `src/hooks/domains/sessions/start.ts` 396 行
8. `src/components/ImportExportModalParts.tsx` 392 行
9. `src/components/focus-mode/hooks/useExceptionRuleFlow.ts` 391 行
10. `src/hooks/domains/sessions/completion.ts` 390 行

### 5. jscpd 热点

`jscpd` 虽然已经达标，但仍有 6 个 clone block，主要集中在：

- `src/components/pet/widget/hooks/usePetWidgetController.ts` 内部自重复 2 处
- `src/components/task-group-editor/DurationSection.tsx` 与 `src/components/chain-editor/sections/AuxiliaryChainSettingsSection.tsx`
- `src/components/rsip/RSIPCanvasView.tsx` 与 `src/components/rsip/RSIPTree.tsx`
- `src/app/app-shell/types.ts` 与 `src/hooks/domains/usePetDomain.ts`
- `src/components/Dashboard.tsx` 与 `src/components/ImportExportModalContainer.tsx`

这部分现在不是 P0，但应该防止反弹。

---

## 当前真正的问题

### 1. “信息型通道”仍然返回非 0

`quality-runner.mjs` 目前的 exit 规则是：

- 只要有任一 check 不是 `pass`，整个 lane 的 `exitCode` 就是 `1`

这导致：

- `quality:ci:info` 名义上是 informational，但本地执行仍会红
- GitHub Actions 之所以不阻塞，只是因为 `ci.yml` 给 info job 配了 `continue-on-error: true`
- “发现 smell” 和 “runner 自身坏掉/缺依赖” 在 exit code 层面没有被清晰地区分

这已经不是“跑不全”的问题，而是 **信号语义不清** 的问题。

### 2. 本地可选工具没有按“可选”工作

仓库文档写的是：

- `security:semgrep`、`lint:sql` 在本地如果底层工具没安装应自动跳过

但当前脚本真实行为是：

- `tools/quality/semgrep.ps1` 找不到 `semgrep` 就 `Write-Error` + `exit 1`
- `tools/quality/sqlfluff.ps1` 找不到 `sqlfluff` 就 `Write-Error` + `exit 1`

这会直接导致：

- 本地 `quality:ci:info` 必红
- 红因不再是代码问题，而是“开发机上没装某个 Python 工具”
- 文档与脚本行为不一致

### 3. `quality:debt-gate` 这个名字已经不够准确

当前脚本定义是：

```json
"quality:debt-gate": "npm run quality:jscpd && npm run quality:debt-gate:core && npm run quality:large-files"
```

这意味着：

- `quality:debt-gate:core` 已经 PASS
- `quality:debt-gate` 聚合命令仍可能因为 `quality:large-files` FAIL
- 当人看到“debt-gate fail”时，很容易误以为是 `jscpd` / 类型断言 / 非空断言超标

现在更准确的描述应是：

- **debt-gate core 已恢复健康**
- **真正仍在 fail 的是 large-file structural budget**

### 4. Nightly 仍然保留旧式 `&&` 编排

虽然 `quality:ci:info` 已经改成 runner，但 `quality:ci:nightly` 仍然是：

```json
"quality:ci:nightly": "npm run test:mutation && npm run quality:test:mutation-hotspots && npm run quality:debt-gate && npm run quality:depcheck && npm run security:semgrep"
```

这意味着 nightly 仍有旧问题：

- 只要前一项失败，后续不再执行
- 后续报告不会生成
- 夜间巡检的可观测性反而比 info lane 差

如果下一步还想继续修 orchestration，优先级应该放在 nightly，而不是回头重做 info lane。

---

## 更新后的实施计划

### Phase 1: 修 lane 语义和本地体验

**目标**：让“信息型通道”真正表达信息，而不是因为环境缺依赖变成假红。

### 1. 给 runner 增加 lane 级别 exit policy

建议在 `tools/quality/quality-runner.mjs` / `tools/quality/lanes.config.mjs` 加一个明确策略，例如：

- `required`：任一 fail/block/stale 即退出非 0
- `info`：永远退出 0，但仍完整写 summary
- `smell-audit`：可保留非 0，或提供 `strict` / `non-strict` 两种入口

最小改法：

- 保持 `quality:ci:info` 名字不变
- 让 `quality:ci:info` 默认 exit 0
- 如确有需要，再补一个 `quality:ci:info:strict`

### 2. 把 semgrep/sqlfluff 改成“本地缺失可跳过，CI 继续强制”

建议行为：

- 本地缺少 `semgrep` / `sqlfluff` 时输出明确的 `SKIPPED` 或 `BLOCKED` 信息
- 本地 exit 0，不污染 info lane
- `CI=true` 时保持强制安装、强制 fail

这样才能和仓库文档一致，也更符合 “Security / SQL Optional Locally” 的说明。

### 3. 明确 `quality:debt-gate` 与 `quality:large-files` 的职责边界

两个可选方案：

1. 保留 `quality:debt-gate:core`，把聚合命令改名为 `quality:structural-budget`
2. 保留 `quality:debt-gate` 名字，但把 `quality:large-files` 从聚合命令里拆出去

我更倾向方案 1，因为语义最清楚。

### 4. 如果脚本入口改名或行为改动，同步更新测试

当前这些测试在钉脚本契约：

- `src/__tests__/repo-governance.test.ts`
- `src/__tests__/quality-lanes.test.ts`

Phase 1 改动如果涉及脚本名、lane 列表或聚合命令，需要同步改测试，不然 CI 会先炸在治理测试本身。

---

### Phase 2: 开始处理真实 backlog

**目标**：不要再围着已经恢复健康的 `jscpd` 打转，把时间花在仍红的结构性债务上。

### 1. 优先处理 large-file-budget，而不是继续追 jscpd

推荐顺序：

1. `src/components/RSIPView.tsx`
2. `src/hooks/domains/useRsipDomain.ts`
3. `src/infra/storage/supabase/rsip.ts`
4. `src/services/rsip-insights/RSIPInsightsService.ts`
5. `src/components/Dashboard.tsx`

建议策略不是一次性从 `30 -> 15` 硬砍，而是先做 ratchet：

- 不允许新增超过 300 行的新文件
- Top offenders 不允许继续膨胀
- 每次拆 2-3 个最高热点文件

等热点拆到 20 左右，再收紧绝对阈值。

### 2. 清理 knip 21 条

最值得先清的点：

- `src/services/migration/index.ts` 的 barrel 再导出
- `src/utils/cache/index.ts` 的 barrel 再导出
- `src/services/rsip-insights/RSIPInsightsService.ts` 里的导出类型
- `import-export` 相关重复导出类型

这批问题收益高，改动也相对可控。

### 3. 清理 sonarjs 29 条

推荐顺序：

1. `void-use` 18 条
2. `cognitive-complexity` 2 条
3. `no-nested-functions` 3 条
4. `no-nested-conditional` 3 条
5. 其余 3 条

这里比 v2 更重要的一点是：**sonar 现在是明确 backlog，不再承担“证明编排坏了”的角色。**

### 4. `ts-prune` 保持在 smell-audit，不要重新拉回 info lane

实测看，`ts-prune` 仍有大量 `(used in module)` 假阳性。

建议：

- 保持它只存在于 `quality:smell-audit`
- 作为一次性迁移辅助工具使用
- 如果后续确认增量价值持续偏低，可以考虑退休

---

### Phase 3: 收 nightly，补最后一圈治理一致性

**目标**：把剩余的 orchestration 旧债收口。

### 1. 用 runner 重写 `quality:ci:nightly`

nightly 现在仍然会短路。建议像 info lane 一样改成 lane runner，至少覆盖：

- `test:mutation`
- `quality:test:mutation-hotspots`
- `quality:debt-gate` 或新的 structural budget lane
- `quality:depcheck`
- `security:semgrep`

### 2. 重新决定 `npm audit` 的位置

当前 `npm audit` 在 info lane 里持续报 14 个漏洞，其中不少需要 breaking upgrade。

建议二选一：

1. 保留在 info lane，但作为纯报告项，不影响本地命令 exit code
2. 移到 nightly 或依赖治理专用流程，避免每次本地跑 info lane 都被它“染红”

### 3. 决定 `quality:circular` 是否升级到 required lane

当前它很快、很稳定，而且值是 0。

如果团队想把“禁止循环依赖”当成硬架构约束，可以把它升到 `quality:ci:required`。但这属于新增治理目标，不是本次 fact check 发现的 bug。

---

## 不建议继续投入的方向

- 不要再把“修 `quality:ci:info` 的短路问题”列为主任务，这部分已经做完。
- 不要再把“去掉 info lane 里的 `ts-prune` / `depcheck`”列为主任务，这部分也已经做完。
- 不要再把“修 jscpd 从 10 clones 降到 6”列为当前目标，这部分已经完成。
- 不要优先重写 `debt-gate:core` 的 jscpd 读取逻辑，除非团队明确要求“单独运行 `quality:debt-gate:core` 也必须完全自愈”。按当前正常路径，它已经不再是主要风险。

---

## 验收标准

1. `npm run quality:ci:info` 本地执行后应完整产出 summary，且默认 exit 0。
2. 本地未安装 `semgrep` / `sqlfluff` 时，info lane 不再因为环境原因变红。
3. `quality:ci:nightly` 不再使用 `&&` 链式短路。
4. `quality:large-files` 至少切换到 ratchet 模式，避免继续把 30 个历史大文件与“新增坏味道”混在一起。
5. `knip` 不高于 21，`sonarjs` 不高于 29，并开始向下收敛。
6. `quality:debt-gate:core` 继续保持 PASS，`jscpd` 不得反弹到 6 以上。

---

## 附录：本次复核时最关键的事实

- `quality:ci:info` 已经改成 runner，且实测不会因首个失败短路。
- `quality:smell-audit` 已经是独立 lane，不再混进 info lane。
- `.gitignore` 已经忽略 `reports/jscpd/`。
- `quality:debt-gate:core` 当前 PASS；`quality:large-files` 当前 FAIL。
- 当前最需要修的不是 `jscpd`，而是：
  - lane exit 语义
  - 本地可选工具行为
  - large-file backlog
  - knip / sonar backlog
