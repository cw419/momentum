# 今日计划（Daily Plans）

## 目的

今日计划是按自然日组织的任务群，不是新的链条类型。它把已有的单元任务链分配为当天可自由选择的计划单元，帮助用户快速整理当天要做什么，而不改变任务链本身的 CTDP 规则、时长或连续完成记录。

## 使用方式

1. 每个自然日最多有一个今日计划，且只能在当天创建；日期由系统自动写入，不能预建未来计划。
2. 在“添加任务”中选择一个已有单元链，增加一个或多个计划单元。例如 `论文代码 × 3` 代表当天预留三个独立的专注单元。
3. 也可选择“创建新任务链”。保存后，新链会自动加入今日计划一个单元。
4. 计划不是固定队列：可从任意未完成单元开始；开始前需确认，避免误触。
5. 当天可随时增减尚未完成的单元。过期计划会自动关闭，剩余单元标记为 `incomplete`，不会被删除。

## 任务链方向

任务链库分为两种方向：

- `periodic`：周期性任务，可反复使用；可删除链条，但不会因为完成一次而消失。
- `goal`：目标性任务，例如一个 project。用户点击“完成并归档”后才会从活跃任务链中隐藏；若今日计划仍有该目标的未完成单元，系统会阻止归档。

方向在创建时确定，当前版本不支持转换。

## 数据模型与状态

`DailyPlan` 以 `planDate`（本地 `YYYY-MM-DD`）唯一标识当天计划，`items` 是独立的 `DailyPlanItem` 数组：

```ts
interface DailyPlanItem {
  id: string;
  dailyPlanId: string;
  chainId: string;
  status: 'pending' | 'completed' | 'incomplete';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  completionHistoryId?: string;
}
```

- `pending`：当天尚可执行的计划单元。
- `completed`：从该单元启动的会话已在完成页确认完成。
- `incomplete`：计划跨日关闭时仍未完成。

完成区以 `completedAt` 倒序显示。开始时间来自实际启动会话；结束时间是用户点击确认完成的真实时间，不是“开始时间 + 计划时长”。

## 今日完成时间表

完成区同时提供一个只读的单日时间轴。它使用 FullCalendar 的 `timeGridDay` 视图，把当天所有成功完成、且同时拥有 `startedAt` 和 `completedAt` 的会话显示为绿色事件块；无论任务从今日计划还是任务链直接开启，都会进入时间表。迁移前、从今日计划完成而尚未写入完成历史开始时间的旧记录，会回退使用计划单元上保留的实际时间；新旧来源按完成记录去重。事件高度对应实际专注时长，并标注任务名称、起止时间和分钟数。时间轴覆盖 00:00–24:00，默认滚动到 06:00，移动端保持单列纵向滚动。

没有实际起止时间的旧完成记录不会被推测或补写到时间轴中。短任务在时间轴中也保留最小可读高度，显示任务名称、起止时间和分钟数；完整内容仍可在悬停提示中查看。云端部署前须应用 `20260825000000_add_completion_history_started_at.sql`。

## 与完成历史的关系

计划单元状态和完成历史是两个不同的领域事实：

- 计划单元记录“今天是否预留并完成了这个配额”，用于当天视图、计划归档和未完成判断。
- `CompletionHistory` 记录一次实际会话，用于连续记录、时长统计、描述和备注，也可来自未计划的任务。

两者不应合并，但从今日计划启动并完成的会话会把新生成的完成历史 ID 写到 `completionHistoryId`。未来实现撤销完成时，应使用这条关联同时处理该计划单元和完成历史，避免只删除其中一边造成显示不一致。

活动会话还会保存 `dailyPlanItemId`，确保正常完成、提前完成或会话恢复后都能将同一个计划单元标为完成。对于升级前未保存该字段的活动会话，应用会按“同任务链 + 同实际开始时间”回退匹配已启动的计划单元。

## 存储与迁移

云端使用 `daily_plans` 表；计划单元保存在 `items` JSONB 中。部署云端同步前必须应用：

```text
supabase/migrations/20260824000000_add_daily_plans.sql
supabase/migrations/20260825000000_add_completion_history_started_at.sql
supabase/migrations/20260825010000_add_active_session_daily_plan_item_id.sql
```

迁移同时向 `chains` 添加 `task_direction` 与 `goal_completed_at`。本地模式使用本地存储的 `dailyPlans` 键，数据结构与云端一致。
