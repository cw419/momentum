# Momentum 数据库 Schema 文档

本文档描述 Momentum 应用的 Supabase/PostgreSQL 数据库结构。

---

## 概览

```mermaid
erDiagram
    auth_users ||--o{ chains : "owns"
    auth_users ||--o{ scheduled_sessions : "owns"
    auth_users ||--o{ active_sessions : "owns"
    auth_users ||--o{ completion_history : "owns"
    auth_users ||--o{ rsip_nodes : "owns"
    auth_users ||--|| rsip_meta : "has"
    auth_users ||--|| user_points : "has"
    auth_users ||--|| user_settings : "has"
    auth_users ||--o{ daily_checkins : "owns"
    auth_users ||--o{ point_transactions : "owns"
    auth_users ||--o{ task_bets : "owns"
    auth_users ||--o{ audit_logs : "owns"

    chains ||--o{ scheduled_sessions : "schedules"
    chains ||--o{ active_sessions : "runs"
    chains ||--o{ completion_history : "records"
    chains ||--o{ task_bets : "bets on"

    active_sessions ||--o| task_bets : "has bet"

    rsip_nodes ||--o{ rsip_nodes : "parent-child"
```

---

## 核心表

### chains（任务链）

主要的任务/习惯定义表。

| 字段                           | 类型        | 约束                          | 说明                              |
| ------------------------------ | ----------- | ----------------------------- | --------------------------------- |
| `id`                           | uuid        | PK, DEFAULT gen_random_uuid() | 主键                              |
| `user_id`                      | uuid        | FK → auth.users, NOT NULL     | 所属用户                          |
| `parent_id`                    | uuid        | FK → chains(id)               | 父任务（任务群）                  |
| `type`                         | text        |                               | 任务类型（unit/group/assault...） |
| `name`                         | text        | NOT NULL                      | 任务名称                          |
| `trigger`                      | text        | NOT NULL                      | 神圣座位触发条件                  |
| `duration`                     | integer     | NOT NULL, DEFAULT 45          | 任务时长（分钟）                  |
| `description`                  | text        | NOT NULL                      | 任务描述                          |
| `current_streak`               | integer     | NOT NULL, DEFAULT 0           | 当前连胜                          |
| `auxiliary_streak`             | integer     | NOT NULL, DEFAULT 0           | 辅助链连胜                        |
| `total_completions`            | integer     | NOT NULL, DEFAULT 0           | 总完成次数                        |
| `total_failures`               | integer     | NOT NULL, DEFAULT 0           | 总失败次数                        |
| `auxiliary_failures`           | integer     | NOT NULL, DEFAULT 0           | 辅助链失败次数                    |
| `exceptions`                   | jsonb       | NOT NULL, DEFAULT '[]'        | 例外规则列表                      |
| `auxiliary_exceptions`         | jsonb       | NOT NULL, DEFAULT '[]'        | 辅助链例外规则                    |
| `auxiliary_signal`             | text        | NOT NULL                      | 预约信号                          |
| `auxiliary_duration`           | integer     | NOT NULL, DEFAULT 15          | 预约时长                          |
| `auxiliary_completion_trigger` | text        | NOT NULL                      | 辅助完成条件                      |
| `time_limit_hours`             | integer     |                               | 任务群时间限制                    |
| `group_started_at`             | timestamptz |                               | 任务群开始时间                    |
| `group_expires_at`             | timestamptz |                               | 任务群过期时间                    |
| `is_durationless`              | boolean     | DEFAULT false                 | 无时长任务标记                    |
| `minimum_duration`             | integer     |                               | 无时长任务最小时长                |
| `is_task_group`                | boolean     |                               | 是否为任务群                      |
| `task_repeat_count`            | integer     |                               | 任务重复次数                      |
| `group_repeat_count`           | integer     |                               | 任务群重复次数                    |
| `sort_order`                   | integer     | DEFAULT 0                     | 排序顺序                          |
| `deleted_at`                   | timestamptz | DEFAULT NULL                  | 软删除时间戳                      |
| `created_at`                   | timestamptz | DEFAULT now()                 | 创建时间                          |
| `last_completed_at`            | timestamptz |                               | 最后完成时间                      |

**索引**：

- `idx_chains_user_id` (user_id)
- `idx_chains_created_at` (created_at DESC)
- `idx_chains_deleted_at` (deleted_at)
- `idx_chains_user_deleted` (user_id, deleted_at)

---

### active_sessions（活动会话）

当前正在进行的任务会话。

| 字段                   | 类型        | 约束                      | 说明                   |
| ---------------------- | ----------- | ------------------------- | ---------------------- |
| `id`                   | uuid        | PK                        | 主键                   |
| `user_id`              | uuid        | FK → auth.users, NOT NULL | 所属用户               |
| `chain_id`             | uuid        | FK → chains(id), NOT NULL | 关联任务               |
| `started_at`           | timestamptz | NOT NULL, DEFAULT now()   | 开始时间               |
| `duration`             | integer     | NOT NULL                  | 会话时长（分钟）       |
| `is_paused`            | boolean     | NOT NULL, DEFAULT false   | 是否暂停               |
| `paused_at`            | timestamptz |                           | 暂停时间               |
| `total_paused_time`    | integer     | NOT NULL, DEFAULT 0       | 总暂停时长（毫秒）     |
| `is_forward_timer`     | boolean     |                           | 是否正向计时           |
| `forward_elapsed_time` | integer     |                           | 正向计时已用时间（秒） |

**索引**：

- `idx_active_sessions_user_id` (user_id)

---

### scheduled_sessions（预约会话）

已预约但尚未开始的任务。

| 字段               | 类型        | 约束                      | 说明     |
| ------------------ | ----------- | ------------------------- | -------- |
| `id`               | uuid        | PK                        | 主键     |
| `user_id`          | uuid        | FK → auth.users, NOT NULL | 所属用户 |
| `chain_id`         | uuid        | FK → chains(id), NOT NULL | 关联任务 |
| `scheduled_at`     | timestamptz | NOT NULL, DEFAULT now()   | 预约时间 |
| `expires_at`       | timestamptz | NOT NULL                  | 过期时间 |
| `auxiliary_signal` | text        | NOT NULL                  | 预约信号 |

**索引**：

- `idx_scheduled_sessions_user_id` (user_id)
- `idx_scheduled_sessions_expires_at` (expires_at)
- `idx_scheduled_sessions_user_chain_unique` (user_id, chain_id) UNIQUE

---

### completion_history（完成历史）

任务完成/失败的历史记录。

| 字段                 | 类型        | 约束                      | 说明             |
| -------------------- | ----------- | ------------------------- | ---------------- |
| `id`                 | uuid        | PK                        | 主键             |
| `user_id`            | uuid        | FK → auth.users, NOT NULL | 所属用户         |
| `chain_id`           | uuid        | FK → chains(id), NOT NULL | 关联任务         |
| `completed_at`       | timestamptz | NOT NULL, DEFAULT now()   | 完成时间         |
| `duration`           | integer     | NOT NULL                  | 计划时长（分钟） |
| `was_successful`     | boolean     | NOT NULL                  | 是否成功         |
| `reason_for_failure` | text        |                           | 失败原因         |
| `actual_duration`    | integer     |                           | 实际用时（分钟） |
| `is_forward_timed`   | boolean     |                           | 是否正向计时     |
| `description`        | text        |                           | 完成描述         |
| `notes`              | text        |                           | 备注             |

**索引**：

- `idx_completion_history_user_id` (user_id)
- `idx_completion_history_chain_id` (chain_id)
- `idx_completion_history_completed_at` (completed_at DESC)
- `idx_completion_history_user_chain_completed_unique` (user_id, chain_id, completed_at) UNIQUE

---

## RSIP 表

### rsip_nodes（RSIP 节点）

递归稳态迭代协议的规则节点。

| 字段            | 类型        | 约束                      | 说明          |
| --------------- | ----------- | ------------------------- | ------------- |
| `id`            | uuid        | PK                        | 主键          |
| `user_id`       | uuid        | FK → auth.users, NOT NULL | 所属用户      |
| `parent_id`     | uuid        | FK → rsip_nodes(id)       | 父节点        |
| `title`         | text        | NOT NULL                  | 国策/定式名称 |
| `rule`          | text        | NOT NULL                  | 规则描述      |
| `sort_order`    | integer     | NOT NULL, DEFAULT 0       | 排序          |
| `use_timer`     | boolean     | NOT NULL, DEFAULT false   | 是否使用计时  |
| `timer_minutes` | integer     |                           | 计时分钟数    |
| `emoji`         | text        |                           | 展示图标      |
| `type`          | text        |                           | 国策类型      |
| `created_at`    | timestamptz | NOT NULL, DEFAULT now()   | 创建时间      |

**索引**：

- `idx_rsip_nodes_user` (user_id)
- `idx_rsip_nodes_parent` (parent_id)
- `idx_rsip_nodes_sort` (sort_order)

### rsip_meta（RSIP 元数据）

每用户一条的 RSIP 配置。

| 字段                     | 类型        | 约束                    | 说明         |
| ------------------------ | ----------- | ----------------------- | ------------ |
| `user_id`                | uuid        | PK, FK → auth.users     | 用户 ID      |
| `last_added_at`          | timestamptz |                         | 最近添加时间 |
| `allow_multiple_per_day` | boolean     | NOT NULL, DEFAULT false | 允许每日多条 |

---

## 积分系统表

### user_points（用户积分）

用户总积分，单一真相来源。

| 字段           | 类型        | 约束                            | 说明     |
| -------------- | ----------- | ------------------------------- | -------- |
| `user_id`      | uuid        | PK, FK → auth.users             | 用户 ID  |
| `total_points` | integer     | NOT NULL, DEFAULT 0, CHECK >= 0 | 总积分   |
| `created_at`   | timestamptz | NOT NULL, DEFAULT now()         | 创建时间 |
| `updated_at`   | timestamptz | NOT NULL, DEFAULT now()         | 更新时间 |

### daily_checkins（每日签到）

签到记录。

| 字段               | 类型        | 约束                            | 说明     |
| ------------------ | ----------- | ------------------------------- | -------- |
| `id`               | uuid        | PK                              | 主键     |
| `user_id`          | uuid        | FK → auth.users, NOT NULL       | 所属用户 |
| `checkin_date`     | date        | NOT NULL, DEFAULT CURRENT_DATE  | 签到日期 |
| `points_earned`    | integer     | NOT NULL, DEFAULT 10, CHECK > 0 | 获得积分 |
| `consecutive_days` | integer     | NOT NULL, DEFAULT 1, CHECK > 0  | 连续天数 |
| `created_at`       | timestamptz | NOT NULL, DEFAULT now()         | 创建时间 |

**约束**：`UNIQUE(user_id, checkin_date)` - 每用户每天仅一条

**索引**：

- `idx_daily_checkins_user_id` (user_id)
- `idx_daily_checkins_user_date` (user_id, checkin_date DESC)
- `idx_daily_checkins_date` (checkin_date DESC)

### point_transactions（积分流水）

所有积分变动的审计日志。

| 字段               | 类型        | 约束                      | 说明             |
| ------------------ | ----------- | ------------------------- | ---------------- |
| `id`               | uuid        | PK                        | 主键             |
| `user_id`          | uuid        | FK → auth.users, NOT NULL | 所属用户         |
| `transaction_type` | text        | NOT NULL                  | 交易类型（见下） |
| `points_change`    | integer     | NOT NULL, CHECK != 0      | 变动数量         |
| `points_before`    | integer     | NOT NULL, CHECK >= 0      | 变动前积分       |
| `points_after`     | integer     | NOT NULL, CHECK >= 0      | 变动后积分       |
| `description`      | text        |                           | 描述             |
| `reference_id`     | uuid        |                           | 关联 ID          |
| `created_at`       | timestamptz | NOT NULL, DEFAULT now()   | 创建时间         |

**交易类型**：

- `checkin` - 签到奖励
- `bonus` - 额外奖励
- `deduction` - 扣除
- `refund` - 退款
- `bet_placed` - 下注
- `bet_won` - 赢得
- `bet_lost` - 失去
- `bet_refunded` - 押注退款

---

## 赌注系统表

### user_settings（用户设置）

用户偏好设置，包括赌注模式。

| 字段                    | 类型        | 约束                    | 说明         |
| ----------------------- | ----------- | ----------------------- | ------------ |
| `user_id`               | uuid        | PK, FK → auth.users     | 用户 ID      |
| `gambling_mode_enabled` | boolean     | NOT NULL, DEFAULT false | 赌注模式开关 |
| `daily_bet_limit`       | integer     | CHECK >= 0              | 每日押注上限 |
| `max_single_bet`        | integer     | CHECK >= 0              | 单注上限     |
| `settings_data`         | jsonb       | NOT NULL, DEFAULT '{}'  | 扩展设置     |
| `created_at`            | timestamptz | NOT NULL, DEFAULT now() | 创建时间     |
| `updated_at`            | timestamptz | NOT NULL, DEFAULT now() | 更新时间     |

### task_bets（任务押注）

押注记录。

| 字段                  | 类型        | 约束                               | 说明         |
| --------------------- | ----------- | ---------------------------------- | ------------ |
| `id`                  | uuid        | PK                                 | 主键         |
| `user_id`             | uuid        | FK → auth.users, NOT NULL          | 所属用户     |
| `session_id`          | uuid        | FK → active_sessions(id), NOT NULL | 关联会话     |
| `chain_id`            | uuid        | FK → chains(id), NOT NULL          | 关联任务     |
| `bet_amount`          | integer     | NOT NULL, CHECK > 0                | 押注金额     |
| `bet_status`          | text        | NOT NULL, DEFAULT 'pending'        | 状态（见下） |
| `points_before`       | integer     | NOT NULL, CHECK >= 0               | 押注前积分   |
| `points_after`        | integer     | CHECK >= 0                         | 结算后积分   |
| `potential_payout`    | integer     | NOT NULL, CHECK > 0                | 潜在收益     |
| `actual_payout`       | integer     | CHECK >= 0                         | 实际收益     |
| `settled_at`          | timestamptz |                                    | 结算时间     |
| `cancellation_reason` | text        |                                    | 取消原因     |
| `metadata`            | jsonb       | NOT NULL, DEFAULT '{}'             | 审计元数据   |
| `created_at`          | timestamptz | NOT NULL, DEFAULT now()            | 创建时间     |

**押注状态**：

- `pending` - 待结算
- `won` - 赢得
- `lost` - 失去
- `cancelled` - 已取消
- `refunded` - 已退款

**约束**：`UNIQUE(user_id, session_id)` - 每会话仅一注

**索引**：

- `idx_task_bets_user_id` (user_id)
- `idx_task_bets_session_id` (session_id)
- `idx_task_bets_chain_id` (chain_id)
- `idx_task_bets_status` (bet_status)
- `idx_task_bets_user_created` (user_id, created_at DESC)
- `idx_task_bets_user_status` (user_id, bet_status)
- `idx_task_bets_settled_at` (settled_at DESC) WHERE settled_at IS NOT NULL

### audit_logs（审计日志）

敏感操作审计。

| 字段         | 类型        | 约束            | 说明     |
| ------------ | ----------- | --------------- | -------- |
| `id`         | uuid        | PK              | 主键     |
| `user_id`    | uuid        | FK → auth.users | 用户 ID  |
| `action`     | text        | NOT NULL        | 操作类型 |
| `details`    | jsonb       | DEFAULT '{}'    | 详情     |
| `ip_address` | inet        |                 | IP 地址  |
| `user_agent` | text        |                 | 用户代理 |
| `created_at` | timestamptz | DEFAULT now()   | 创建时间 |

---

## RLS（行级安全）策略

所有表都启用了 RLS，确保用户只能访问自己的数据。

### 通用策略模式

```sql
-- 用户只能操作自己的数据
CREATE POLICY "Users can manage their own [table]"
  ON [table]
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 特殊策略

| 表           | 策略             | 说明                      |
| ------------ | ---------------- | ------------------------- |
| `task_bets`  | 仅 SELECT/INSERT | 更新通过数据库函数处理    |
| `audit_logs` | 仅 SELECT        | 用户只读，系统写入        |
| `chains`     | 包含软删除       | 用户可查看/恢复已删除链条 |

---

## 数据库函数

### 签到系统

| 函数                       | 参数                       | 返回  | 说明         |
| -------------------------- | -------------------------- | ----- | ------------ |
| `perform_daily_checkin`    | user_id uuid               | jsonb | 原子签到操作 |
| `get_user_checkin_stats`   | user_id uuid               | jsonb | 获取签到统计 |
| `get_user_checkin_history` | user_id, page_size, offset | jsonb | 分页签到历史 |

### 赌注系统

| 函数                       | 参数                            | 返回  | 说明         |
| -------------------------- | ------------------------------- | ----- | ------------ |
| `place_task_bet`           | user_id, session_id, bet_amount | jsonb | 原子下注     |
| `settle_task_bet`          | bet_id, task_successful, notes  | jsonb | 结算押注     |
| `get_user_gambling_stats`  | user_id                         | jsonb | 赌博统计     |
| `get_user_betting_history` | user_id, page_size, offset      | jsonb | 分页押注历史 |

---

## 迁移历史

| 迁移文件                                                | 日期       | 说明                                   |
| ------------------------------------------------------- | ---------- | -------------------------------------- |
| `20250730021823_winter_flame.sql`                       | 2025-07-30 | 初始 schema：chains, sessions, history |
| `20250801160754_peaceful_palace.sql`                    | 2025-08-01 | 添加 parent_id, type, sort_order       |
| `20250808000000_add_group_time_limit.sql`               | 2025-08-08 | 任务群时间限制                         |
| `20250808001000_add_durationless_flag.sql`              | 2025-08-08 | 无时长任务支持                         |
| `20250810000000_add_rsip_tables.sql`                    | 2025-08-10 | RSIP 系统                              |
| `20250814000000_add_soft_delete.sql`                    | 2025-08-14 | 软删除/回收箱                          |
| `20250817000000_add_completion_description_notes.sql`   | 2025-08-17 | 完成描述和备注                         |
| `20250817100000_add_timing_fields.sql`                  | 2025-08-17 | 正向计时字段                           |
| `20250820000000_performance_optimization.sql`           | 2025-08-20 | 性能优化索引                           |
| `20250904000000_add_daily_checkin_system.sql`           | 2025-09-04 | 签到积分系统                           |
| `20250905000000_add_gambling_mode_system.sql`           | 2025-09-05 | 赌注系统                               |
| `20250905100000_fix_bet_transaction_atomicity.sql`      | 2025-09-05 | 押注事务修复                           |
| `20250906000000_implement_universal_write_sessions.sql` | 2025-09-06 | 通用写入会话                           |
| `20250906000001-6_*.sql`                                | 2025-09-06 | 函数冲突修复系列                       |
| `20250122000000_performance_optimization_v2.sql`        | 2025-01-22 | 性能优化 v2                            |

---

## 常用查询示例

### 获取活动链条（排除已删除）

```sql
SELECT * FROM chains
WHERE user_id = auth.uid()
  AND deleted_at IS NULL
ORDER BY sort_order, created_at;
```

### 获取回收箱链条

```sql
SELECT * FROM chains
WHERE user_id = auth.uid()
  AND deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

### 获取今日签到状态

```sql
SELECT EXISTS (
  SELECT 1 FROM daily_checkins
  WHERE user_id = auth.uid()
    AND checkin_date = CURRENT_DATE
) AS has_checked_in_today;
```

### 获取用户可用积分

```sql
SELECT total_points FROM user_points
WHERE user_id = auth.uid();
```

---

## 相关文档

- `docs/guides/ARCHITECTURE.md` - 整体架构
- `docs/features/DOMAIN_BETTING.md` - 赌注系统
- `docs/features/DOMAIN_RULES.md` - 例外规则
- `docs/guides/apply-migration.md` - 迁移指南
