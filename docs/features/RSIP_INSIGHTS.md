# RSIP 分析与推荐引擎

基于执行数据、轮次历史和节点状态，自动生成 KPI 汇总、趋势分析、风险识别和改进建议。

---

## 概述

Insights 引擎从 RSIP 的多维数据中提取信号，帮助用户理解当前国策体系的健康状况，并给出可操作的改进建议。引擎以纯函数 `buildRSIPInsights` 实现，无副作用，支持中英双语。

---

## 输入数据

```typescript
interface BuildRSIPInsightsInput {
  nodes: RSIPNode[]; // 当前活跃节点
  runHistory: RSIPRunRecord[]; // 轮次历史
  executionRecords: RSIPExecutionRecord[]; // 执行记录
  groups: RSIPNodeGroup[]; // 国策组
  taskLinks: RSIPTaskLink[]; // 任务联动
  policyLibrary: RSIPLibraryEntry[]; // 国策库
  now?: Date; // 当前时间（测试用）
  locale?: string; // 语言（zh/en）
}
```

---

## 输出结构

### 汇总指标 (RSIPInsightSummary)

| 指标                    | 说明                    |
| ----------------------- | ----------------------- |
| `activeNodeCount`       | 活跃国策数              |
| `strictNodeCount`       | 严格模式节点数（非 E0） |
| `passiveNodeRatio`      | 被动国策占比            |
| `reinforcementCoverage` | 强化覆盖率              |
| `policyLibrarySize`     | 国策库条目数            |
| `runCount`              | 总轮次数                |
| `linkCount`             | 活跃联动数              |
| `executionCount14d`     | 近 14 天执行次数        |
| `violationCount14d`     | 近 14 天违约次数        |
| `successRate14d`        | 近 14 天成功率          |

### 趋势快照 (RSIPTrendSnapshot)

| 指标                     | 说明                                                 |
| ------------------------ | ---------------------------------------------------- |
| `maxNodeTrend`           | 节点规模趋势（up / down / flat / insufficient_data） |
| `runDurationTrend`       | 轮次时长趋势                                         |
| `collapseFrequency14d`   | 近 14 天崩溃次数                                     |
| `averageMaxNodeCount`    | 历史平均峰值节点数                                   |
| `averageRunDurationDays` | 历史平均轮次天数                                     |

### 风险节点 (RSIPRiskNode)

按综合风险评分排序的节点列表，评分公式：

```
failureCost = (子孙节点数 + 1) × 阶段权重 × 强化折扣
综合评分 = failureCost × (1 + violationRate) + violated × 0.5
```

- 阶段权重：E0 = 1, E1 = 2, E2 = 3
- 强化折扣：有强化 = 0.3，无强化 = 1

### 农村包围城市候选队列

从风险节点中筛选 `failureCost <= 2.5` 的低成本节点，按违约率升序排列，取前 5 条。这些是崩溃后优先恢复的候选。

---

## 推荐类型

引擎最多输出 6 条推荐，每条包含优先级（high / medium / low）、标题、理由和行动项。

| 类型            | 优先级 | 触发条件                                    |
| --------------- | ------ | ------------------------------------------- |
| `rural_first`   | high   | 存在高风险节点或近 14 天崩溃 >= 2 次        |
| `split`         | high   | 存在高风险节点（failureCost >= 4 且有违约） |
| `grouping`      | medium | 未分组节点 >= 4 且无国策组                  |
| `reinforcement` | medium | 存在 E2 节点但未强化，且成功率 >= 60%       |
| `passive`       | medium | 被动覆盖率 < 20% 且近期有违约               |
| `automation`    | low    | 无活跃联动                                  |
| `rebuild`       | medium | 节点规模或轮次时长趋势下降                  |

### rural_first（农村包围城市重启）

当高成本中心节点不稳定时，建议冻结高风险节点，优先推进低成本边缘国策重建。引擎会根据节点标题自动生成领域相关的替代方案（睡眠、运动、饮食等）。

### split（拆分高风险国策）

高失败成本叠加高违约频率时，建议将国策拆分为 3-5 条微国策，每条可在 10-20 分钟内执行，至少包含 1 条被动护栏。

### grouping（建立国策组）

节点多且未分组时，建议创建 1-2 个国策组并配置容错，降低级联风险。

### reinforcement（强化 E2 节点）

稳定但未强化的 E2 节点，通过少量投入即可提高抗回滚能力。

### passive（增加被动护栏）

被动国策覆盖率偏低时，建议增加环境护栏型国策，降低意志力负担。

### automation（启用联动）

未配置任何联动时，建议从 `task_completed -> mark_rsip_executed` 开始配置。

### rebuild（国策库辅助重建）

轮次趋势下滑时，建议从国策库恢复已验证的高内化条目，而非只新增新国策。

---

## 关键文件

| 文件                                                | 职责                                   |
| --------------------------------------------------- | -------------------------------------- |
| `src/services/rsip-insights/RSIPInsightsService.ts` | 核心引擎（纯函数 `buildRSIPInsights`） |
| `src/components/rsip/RSIPInsightsPanel.tsx`         | Insights 面板 UI                       |
| `src/components/RSIPView.tsx`                       | RSIP 主视图（insights tab 入口）       |

---

## UI 面板：RSIPInsightsPanel

面板通过 RSIP 主视图的 insights tab 访问，展示以下区域：

1. **KPI 卡片行**：活跃国策数、14 天成功率、被动覆盖率、强化覆盖率
2. **趋势卡片行**：节点规模趋势、轮次时长趋势、14 天崩溃次数
3. **农村包围城市候选队列**：低成本候选节点列表（含失败成本和违约率）
4. **推荐助手**：按优先级排列的推荐卡片（含标题、理由、行动项）

---

## 相关文档

- [DOMAIN_RSIP.md](./DOMAIN_RSIP.md) - RSIP 领域文档
- [RSIP_TASK_INTEGRATION.md](./RSIP_TASK_INTEGRATION.md) - RSIP 任务联动
- [RSIP_POLICY_LIBRARY.md](./RSIP_POLICY_LIBRARY.md) - 国策库
- [RSIP_RUN_HISTORY.md](./RSIP_RUN_HISTORY.md) - 轮次历史
