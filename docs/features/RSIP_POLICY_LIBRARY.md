# RSIP 国策库

归档已移除的国策节点，保留内化进度，支持随时恢复到国策树的任意位置。

---

## 概述

当国策节点因违反或手动删除而从活跃树中移除时，其历史数据会沉淀到国策库中。国策库保留了每条国策的累计执行天数、内化进度和使用次数，用户可以在后续轮次中从库中恢复已验证的国策，而非从零开始。

---

## 数据模型

### RSIPLibraryEntry

```typescript
interface RSIPLibraryEntry {
  id: string;
  title: string;
  rule: string;
  type?: string;
  emoji?: string;
  cumulativeExecutionDays: number;  // 跨轮次累计执行天数
  internalizationProgress: number;  // 内化进度 0-100
  lastActiveAt: Date;               // 最后活跃时间
  timesUsed: number;                // 使用次数（被恢复的次数）
  useTimer?: boolean;
  timerMinutes?: number;
  isPassive?: boolean;              // 是否为被动国策
}
```

---

## 数据库表

### rsip_policy_library

```sql
CREATE TABLE rsip_policy_library (
  id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rule TEXT NOT NULL,
  type TEXT,
  emoji TEXT,
  cumulative_execution_days INTEGER NOT NULL DEFAULT 0,
  internalization_progress NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (internalization_progress >= 0 AND internalization_progress <= 100),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  times_used INTEGER NOT NULL DEFAULT 0,
  use_timer BOOLEAN NOT NULL DEFAULT FALSE,
  timer_minutes INTEGER,
  is_passive BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
```

RLS 策略：用户只能管理自己的国策库条目。

---

## 关键文件

| 文件 | 职责 |
| --- | --- |
| `src/types/rsip.ts` | `RSIPLibraryEntry` 类型定义 |
| `src/components/rsip/RSIPPolicyLibrary.tsx` | 国策库 UI 组件 |
| `src/components/RSIPView.tsx` | RSIP 主视图（library tab 入口） |
| `src/infra/storage/supabase/rsip.ts` | Supabase 存储实现 |

---

## UI 组件：RSIPPolicyLibrary

国策库面板通过 RSIP 主视图的 library tab 访问，展示以下内容：

- **条目卡片**：每条归档国策显示标题、规则描述、内化进度条、累计执行天数和使用次数
- **恢复操作**：用户可选择将条目恢复为新根节点，或挂接到现有树中的任意父节点下
- **排序**：按最后活跃时间倒序排列

---

## 相关文档

- [DOMAIN_RSIP.md](./DOMAIN_RSIP.md) - RSIP 领域文档
- [RSIP_INSIGHTS.md](./RSIP_INSIGHTS.md) - RSIP 分析与推荐
- [RSIP_RUN_HISTORY.md](./RSIP_RUN_HISTORY.md) - 轮次历史
