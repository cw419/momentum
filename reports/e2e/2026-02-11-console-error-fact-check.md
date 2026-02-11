# 基于 `console error整理.md` 的事实核查报告（2026-02-11）

## Summary
- 本报告对 `console error整理.md` 做了逐项 fact-check，保留原结构意图，但修正了不准确结论。
- 证据来源为线上 `https://momentumctdp.netlify.app/` 的 DevTools Network/Console 抓包 + 仓库代码位点 + 迁移文件位点。
- 测试账号：`20260210@test.com`（用户 ID：`7c779d5c-67b3-4a33-85a3-1121910310b0`）。
- 结论：生产库 schema 与前端代码存在版本漂移；部分流程可降级成功，部分功能被缺表直接阻断。

## 核查矩阵
| 原结论 | 核查结果 | 证据(reqid/响应体/代码位点) | 修正文本 |
|---|---|---|---|
| `rsip_groups` / `rsip_policy_library` / `rsip_run_history` / `rsip_task_links` / `rsip_execution_records` 404 | 成立 | `reqid=96/97/98/99/100`：`42P01 relation ... does not exist`。<br>代码读取位点：`src/infra/storage/supabase/rsip.ts:337`, `src/infra/storage/supabase/rsip.ts:404`, `src/infra/storage/supabase/rsip.ts:487`, `src/infra/storage/supabase/rsip.ts:559`, `src/infra/storage/supabase/rsip.ts:637`。<br>迁移位点：`supabase/migrations/20260208000000_rsip_process_integration.sql:31`, `supabase/migrations/20260208000000_rsip_process_integration.sql:79`, `supabase/migrations/20260208000000_rsip_process_integration.sql:122`, `supabase/migrations/20260208000000_rsip_process_integration.sql:158`, `supabase/migrations/20260124000000_rsip_execution_tracking.sql:23`。 | 这是生产库缺迁移导致的真实阻断，不是纯前端误报。 |
| `active_sessions` 首次查询 400 | 成立 | `reqid=92`：`42703 column active_sessions.is_forward_timer does not exist`。<br>`reqid=102`：降级查询成功（200）。<br>代码降级位点：`src/infra/storage/supabase/sessions.ts:102`, `src/infra/storage/supabase/sessions.ts:109`, `src/infra/storage/supabase/sessions.ts:128`, `src/infra/storage/supabase/sessions.ts:136`。<br>列定义迁移位点：`supabase/migrations/20250820000000_performance_optimization.sql:53`, `supabase/migrations/20250820000000_performance_optimization.sql:63`。 | “首跳 400 + 随后回退成功”是准确描述。 |
| 创建链/任务群仅保存到本地，云端失败 | 不成立 | 创建链：`reqid=60`（400, `PGRST204 group_repeat_count`）→ `reqid=63`（201）→ `reqid=65`（200，读回 `factcheck-chain-20260211`）。<br>创建任务群：`reqid=118`（400）→ `reqid=120`（201）→ `reqid=121`（200，读回 `factcheck-group-20260211`）。<br>代码位点：`src/infra/storage/supabase/chains/mutations.ts:146`, `src/infra/storage/supabase/chains/mutations.ts:200`, `src/infra/storage/supabase/chains/mutations.ts:221`。 | 首次严格 payload 失败后，基础 payload 会写入成功；不是“仅本地保存”。 |
| `chains` 与 `rsip_nodes` 没有降级逻辑 | 不成立 | `chains` 降级逻辑：`src/infra/storage/supabase/chains/mutations.ts:221`。<br>`rsip_nodes` 降级逻辑：`src/infra/storage/supabase/rsip.ts:186`, `src/infra/storage/supabase/rsip.ts:237`, `src/infra/storage/supabase/rsip.ts:243`。<br>测试位点：`src/infra/storage/supabase/__tests__/chains.test.ts:581`, `src/infra/storage/supabase/__tests__/rsip.test.ts:295`。<br>线上证据：`reqid=173`（400）→ `reqid=175`（200）。 | 降级路径已存在且线上触发成功。 |
| `rsip_nodes`、`rsip_meta` 400 | 部分成立 | `rsip_nodes`：`reqid=173`（400, `PGRST204 consecutive_executions`）→ `reqid=175`（200）。<br>`rsip_meta`：`reqid=179`（400, `PGRST204 current_run_number`）→ `reqid=181`（200）。<br>代码位点：`src/infra/storage/supabase/rsip.ts:186`, `src/infra/storage/supabase/rsip.ts:280`。 | 严格字段写入会报错，但有回退成功；属于“有噪声但可继续”。 |
| `user_settings` 406 稳定复现 | 本轮未复现（条件性问题） | `reqid=40` / `reqid=46`：均为 200，返回对象。<br>请求头显示 `accept: application/vnd.pgrst.object+json`。<br>代码位点：`src/infra/storage/supabase/userSettings.ts:27`（`.single()`）。 | 不应写成稳定复现；更合理表述是“与无记录账号 + `.single()` 语义相关的条件性噪声”。 |
| “总计 8 个错误” | 不应固化为事实 | 错误请求数随路径变化：首屏已有 `active_sessions` + 5 个 RSIP 缺表错误；执行 RSIP 动作后又出现 `reqid=173/177/179` 等新增错误。 | 报告应按“错误类型 + 可复现条件”统计，不应固定总数。 |

## 影响评估（按错误类型重写）
### 1) 功能阻断
- RSIP 缺表（`rsip_groups` / `rsip_policy_library` / `rsip_run_history` / `rsip_task_links` / `rsip_execution_records`）导致对应模块无法正常工作。

### 2) 可回退但高噪声
- `chains` 严格列 upsert 首次 400 后回退成功。
- `rsip_nodes`、`rsip_meta` 严格列 upsert 首次 400 后回退成功。
- `active_sessions` 首次查询 400 后基础字段重试成功。

### 3) 外部依赖噪声
- `gtag` 请求受网络策略影响，可能失败或成功；不影响核心业务流程。

## 修复优先级（可直接执行）
### P0：补齐生产 Supabase 缺失迁移
- 至少补齐：
  - `supabase/migrations/20260124000000_rsip_execution_tracking.sql`
  - `supabase/migrations/20260208000000_rsip_process_integration.sql`
- 同步校验：
  - `supabase/migrations/20250820000000_performance_optimization.sql`
  - `supabase/migrations/20260114000000_add_chain_repeat_and_minimum_duration.sql`

### P1：减少“先失败再回退”噪声
- 为 `SupabaseStorage` 增加按表/列维度的 capability cache。
- 一旦判定缺列，本会话直接走基础 payload，避免每次先发必失败请求。

### P1：`user_settings` 读取改为 nullable-safe
- 将 `.single()` 改为 `.maybeSingle()`（或等价策略），避免“无记录账号”出现 406 红字。

### P2：`gtag` 降噪
- 按环境策略降级日志级别，不将第三方统计失败混入核心错误流。

## 计划中的接口/类型变更（后续实现）
1. `SupabaseStorage` 增加 schema capability cache（表/列维度）。
2. `userSettings` 读取策略改为 nullable-safe 路径（`maybeSingle` 或同等实现）。
3. RSIP/Chains 写入路径增加“缺列判定后直接走基础 payload”的会话级短路。

## 回归验收标准
- `创建链` 后刷新仍在云端。
- `创建任务群` 后刷新仍在云端。
- `RSIP 标记执行` 不再出现 `404/42P01`（迁移完成后）。
- 首页首屏不再出现 `active_sessions` 首跳 400（或仅首轮一次并缓存跳过）。
- `user_settings` 在“无记录账号”不出现 406 红字。

## 测试数据备注（仅标记，不自动清理）
- 本轮新增链：
  - `factcheck-chain-20260211`（id：`56456363-f0a0-4c93-86d5-08905ffbe6d6`，`created_at=2026-02-11T14:53:16.062Z`）
- 本轮新增任务群：
  - `factcheck-group-20260211`（id：`1a3b8153-b2e6-4d4f-9f51-f2b0c1ec1c69`，`created_at=2026-02-11T14:54:09.488Z`）
- 本轮 RSIP 执行动作：
  - 节点 `ca8007c6-5d5b-4529-9071-d1262e253682` 标记“已执行”；`rsip_execution_records` 插入请求 `reqid=177` 返回 404（缺表）。

