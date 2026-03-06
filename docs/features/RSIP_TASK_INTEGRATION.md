# RSIP-任务流程联动系统

RSIP 与任务/任务组之间的双向事件驱动联动，实现国策执行与日常任务流程的自动化协同。

---

## 概述

联动系统在 RSIP 国策节点与任务链（Chain）/任务组（Group）之间建立映射关系（Link）。当一侧发生事件时，可自动或经确认后触发另一侧的对应动作。

### 两个方向

| 方向         | 触发事件                                                        | 效果                                           |
| ------------ | --------------------------------------------------------------- | ---------------------------------------------- |
| 任务 -> RSIP | `task_completed` / `task_interrupted` / `group_cycle_completed` | `mark_rsip_executed` / `mark_rsip_violated`    |
| RSIP -> 任务 | `rsip_mark_executed`                                            | `prompt_start_chain` / `prompt_schedule_chain` |

### 自动化模式

| 模式      | 说明                                     |
| --------- | ---------------------------------------- |
| `auto`    | 事件触发后自动执行效果，无需用户确认     |
| `confirm` | 事件触发后弹出确认提示，用户决定是否执行 |

默认规则：任务 -> RSIP 方向默认 `auto`；RSIP -> 任务方向默认 `confirm`。

---

## 数据模型

### RSIPTaskLink

```typescript
// src/types/rsipIntegration.ts

interface RSIPTaskLink {
  id: string;
  userId?: string;
  rsipNodeId: string; // 关联的 RSIP 节点
  chainId: string; // 关联的任务链/任务组
  chainKind: 'group' | 'unit';
  triggerEvent: RSIPTaskLinkTriggerEvent;
  effect: RSIPTaskLinkEffect;
  automation: 'auto' | 'confirm';
  isActive: boolean;
  updatedAt: Date;
}
```

### 触发事件枚举

| 事件                    | 说明                  |
| ----------------------- | --------------------- |
| `task_completed`        | 任务完成              |
| `task_interrupted`      | 任务中断              |
| `group_cycle_completed` | 任务组周期完成        |
| `rsip_mark_executed`    | RSIP 节点标记为已执行 |

### 效果枚举

| 效果                    | 说明                 |
| ----------------------- | -------------------- |
| `mark_rsip_executed`    | 标记国策节点已执行   |
| `mark_rsip_violated`    | 标记国策节点已违反   |
| `prompt_start_chain`    | 提示用户立即开始任务 |
| `prompt_schedule_chain` | 提示用户安排任务     |

---

## 数据库表

### rsip_task_links

```sql
CREATE TABLE rsip_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsip_node_id UUID NOT NULL REFERENCES rsip_nodes(id) ON DELETE CASCADE,
  chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  chain_kind TEXT NOT NULL CHECK (chain_kind IN ('group', 'unit')),
  trigger_event TEXT NOT NULL,
  effect TEXT NOT NULL,
  automation TEXT NOT NULL DEFAULT 'confirm',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 唯一约束：同一用户、节点、任务、事件、效果组合唯一
CREATE UNIQUE INDEX uq_rsip_task_links_key
  ON rsip_task_links(user_id, rsip_node_id, chain_id, trigger_event, effect);
```

RLS 策略：用户只能管理自己的联动记录。

---

## 关键文件

| 文件                                                          | 职责                                         |
| ------------------------------------------------------------- | -------------------------------------------- |
| `src/types/rsipIntegration.ts`                                | 联动类型定义                                 |
| `src/services/rsip-integration/RSIPTaskIntegrationService.ts` | 联动核心服务（LWW 冲突解决、事件匹配、去重） |
| `src/components/rsip/RSIPTaskLinkPanel.tsx`                   | 联动管理面板 UI                              |
| `src/components/chain-editor/ChainEditorView.tsx`             | 任务编辑器内嵌联动区                         |
| `src/components/task-group-editor/TaskGroupEditorView.tsx`    | 任务组编辑器内嵌联动区                       |
| `src/infra/storage/supabase/rsip.ts`                          | Supabase 存储实现                            |

---

## 核心服务：RSIPTaskIntegrationService

```typescript
// src/services/rsip-integration/RSIPTaskIntegrationService.ts

class RSIPTaskIntegrationService {
  // LWW 冲突解决：相同 key 的 link 保留 updatedAt 最新的
  resolveLatestLinks(links: RSIPTaskLink[]): RSIPTaskLink[];

  // 合并已有 links 和新 links
  upsertLinks(
    existing: RSIPTaskLink[],
    incoming: RSIPTaskLink[],
  ): RSIPTaskLink[];

  // 匹配任务事件 -> RSIP 方向的 links（含每日去重）
  matchTaskEventLinks(
    allLinks: RSIPTaskLink[],
    payload: RSIPTaskEventPayload,
  ): RSIPTaskEventLinkMatch[];

  // 获取 RSIP -> 任务方向的 links
  getRsipToTaskLinks(
    allLinks: RSIPTaskLink[],
    rsipNodeId: string,
  ): RSIPTaskLink[];
}
```

### 冲突解决策略

采用 **Last-Write-Wins (LWW)**：当同一 `(userId, rsipNodeId, chainId, triggerEvent, effect)` 组合存在多条记录时，保留 `updatedAt` 最新的一条。

### 事件去重

同一 link + 同一事件 + 同一天内只触发一次，防止重复执行。

---

## UI 组件：RSIPTaskLinkPanel

联动面板支持两种使用场景：

### 1. RSIP 主界面（全局模式）

在 RSIP 视图中管理所有联动，可自由选择任意节点和任意任务。

### 2. 编辑器内嵌模式（锁定模式）

在任务编辑器或任务组编辑器中，通过 `fixedChainId` 锁定当前任务/任务组，只显示和管理与该任务相关的联动。

- 编辑已有任务时：直接显示联动管理面板
- 创建新任务时：提示用户先保存任务后再配置联动

---

## 使用场景

### 场景 1：任务完成自动标记国策已执行

```
触发事件: task_completed
效果: mark_rsip_executed
自动化: auto
```

用户完成"晨间冥想"任务后，自动将 RSIP 中"每日冥想"国策标记为已执行。

### 场景 2：RSIP 执行后提示开始关联任务

```
触发事件: rsip_mark_executed
效果: prompt_start_chain
自动化: confirm
```

用户在 RSIP 中标记"晨间运动"已执行后，弹出提示询问是否开始"运动计划"任务。

---

## 相关文档

- [DOMAIN_RSIP.md](./DOMAIN_RSIP.md) - RSIP 领域文档
- [RSIP_INSIGHTS.md](./RSIP_INSIGHTS.md) - RSIP 分析与推荐
- [RSIP_PROTOCOL.md](../modules/RSIP_PROTOCOL.md) - RSIP 协议概述
