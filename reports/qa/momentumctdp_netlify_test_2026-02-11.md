# Momentum Web App 测试报告（Netlify）

- 测试日期：2026-02-11
- 测试站点：`https://momentumctdp.netlify.app/`
- 参考文档：`docs/guides/TESTING_GUIDE.md`、`docs/FEATURES_OVERVIEW.md`
- 测试账号：`20260210@test.com`
- 测试方式：DevTools MCP（UI + Console + Network）+ Supabase CLI（npx）

## 1. 执行结论

- 核心流程可用：登录/登出、链条创建、复制、删除、回收箱恢复、任务群创建、专注模式开始/暂停/继续/中断、签到、数据管理入口均可操作。
- 存在明显后端 schema 漂移：前端多处请求触发 `400/404`，但部分场景依赖 fallback 继续工作。
- 建议优先处理数据库迁移一致性，否则会持续出现隐式降级与噪音报错。

## 2. 主要测试结果（按文档关键项）

### 2.1 认证

- 1.3 登录：通过（账号可正常进入主界面）
- 1.4 登出：通过（回到登录落地页）
- 1.5 数据同步：通过（重新登录后云端数据可见）

### 2.2 链条与任务群

- 2.1 创建链条：通过（创建 `qa-chain-20260211-webtest`）
- 2.3 复制链条：通过（出现第二条同名副本）
- 2.4 删除链条：通过（进入回收箱）
- 10.1/10.2 回收箱查看/恢复：通过（恢复后回收箱清空）
- 4.1 创建任务群：通过（创建 `qa-group-20260211-webtest`）

### 2.3 会话执行

- 3.2 开始任务：通过（进入 focus 视图，URL 为 `?view=focus&chain=...`）
- 3.3 暂停任务：通过（弹出例外规则，应用后进入暂停态）
- 3.4 恢复任务：通过（可继续计时）
- 3.6 中断任务：通过（确认后返回主界面）

### 2.4 导航与可用性

- P0 Skip Link：通过（`Tab` 后 `Enter`，焦点落到 `main`）
- P0 URL 状态与前进后退：通过（`rsip/detail/editor/group` 深链与浏览器前进后退一致）
- 11.1 导出入口：通过（数据管理弹窗可打开并触发导出按钮）
- 9.1 签到：通过（点击后积分与连续天数更新）

## 3. 发现的问题（按严重度）

### 高：线上数据库缺迁移，导致多处 400/404

1. `active_sessions` 缺字段  
   - 证据：`reqid=280`（`400`）  
   - 返回：`column active_sessions.is_forward_timer does not exist`
2. `chains` 缺字段（批量 upsert 首次失败）  
   - 证据：`reqid=306`（`400`）  
   - 返回：`Could not find the 'group_repeat_count' column of 'chains'`
3. RSIP 扩展表缺失  
   - 证据：`reqid=284/285/286/287/288`（`404`）  
   - 返回示例：`relation "public.rsip_groups" does not exist`
4. `completion_history` 缺唯一约束（on_conflict 失败）  
   - 证据：`reqid=298`（`400`）  
   - 返回：`there is no unique or exclusion constraint matching the ON CONFLICT specification`

说明：这些失败后多数有 fallback 请求继续成功（例如 `reqid=308`、`reqid=303`），所以 UI 看起来“能用”，但实际存在数据层降级与错误噪音。

### 低：可访问性告警

- Console Issues：表单字段存在“无 label”与“缺少 id/name”告警（消息见 `msgid=36/37/40`）。

## 4. Console 与 Network 摘要

- Console：出现 `400` 资源加载错误（与上面 schema 漂移对应）。
- 另有一次 `401` 为测试脚本手工请求使用错误 key 触发（非应用正常流程问题）。

## 5. Supabase CLI 辅助结果

执行情况：

- `supabase` 可执行文件未安装（系统命令不可用）。
- 使用 `npx --yes supabase --version` 成功，版本 `2.76.8`。
- `npx --yes supabase migration list` 失败：未 `supabase link`（无 project ref）。
- `npx --yes supabase migration list --local` 失败：本地 Postgres 未启动（`127.0.0.1:54322` refused）。

补充核对（仓库迁移文件）：

- `active_sessions` 前向计时字段已在迁移中定义：`supabase/migrations/20250820000000_performance_optimization.sql`
- `chains.group_repeat_count` 已在迁移中定义：`supabase/migrations/20260114000000_add_chain_repeat_and_minimum_duration.sql`
- RSIP 扩展表已在迁移中定义：`supabase/migrations/20260124000000_rsip_execution_tracking.sql`、`supabase/migrations/20260208000000_rsip_process_integration.sql`

推断：线上 Supabase 库落后于仓库迁移版本，或迁移未完整应用。

## 6. 本次测试产生的数据变更

- 新建链条：`qa-chain-20260211-webtest`（2 条）
- 新建任务群：`qa-group-20260211-webtest`
- 进行了签到（积分与连续天数增加）
- 产生了中断任务历史记录（失败记录）

