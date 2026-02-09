# RSIP 轮次历史

记录 RSIP 国策体系的每一次"轮次"生命周期，包括启动、峰值、崩溃原因等关键数据。

---

## 概述

RSIP 的"轮次"（Run）代表一次完整的国策体系运行周期。当体系因重大违约而崩溃时，当前轮次结束，新轮次开始。轮次历史帮助用户回顾每次崩溃的原因，识别反复出现的薄弱环节。

---

## 数据模型

### RSIPRunRecord

```typescript
interface RSIPRunRecord {
  runNumber: number;          // 轮次编号（从 1 开始递增）
  startedAt: Date;            // 轮次开始时间
  endedAt?: Date;             // 轮次结束时间（进行中则为空）
  maxNodeCount: number;       // 本轮峰值节点数
  durationDays: number;       // 持续天数
  collapseReason?: string;    // 崩溃原因
  collapseNodeTitle?: string; // 导致崩溃的节点标题
}
```

### RSIPMeta 轮次字段扩展

```typescript
interface RSIPMeta {
  // ... 已有字段
  currentRunNumber?: number;      // 当前轮次编号
  currentRunStartedAt?: Date;     // 当前轮次开始时间
}
```

---

## 数据库表

### rsip_run_history

```sql
CREATE TABLE rsip_run_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL CHECK (run_number > 0),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  max_node_count INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 0,
  collapse_reason TEXT,
  collapse_node_title TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, run_number)
);
```

RLS 策略：用户只能管理自己的轮次记录。

---

## 关键文件

| 文件 | 职责 |
| --- | --- |
| `src/types/rsip.ts` | `RSIPRunRecord` 类型定义 |
| `src/components/rsip/RSIPRunHistory.tsx` | 轮次历史 UI 组件 |
| `src/components/RSIPView.tsx` | RSIP 主视图（history tab 入口） |
| `src/infra/storage/supabase/rsip.ts` | Supabase 存储实现 |

---

## UI 组件：RSIPRunHistory

轮次历史面板通过 RSIP 主视图的 history tab 访问，展示以下内容：

**统计卡片行**：
- 总轮次数
- 最长持续天数
- 平均峰值节点数

**轮次卡片列表**（按轮次编号倒序）：
- 轮次编号和时间范围
- 持续天数和峰值节点数
- 崩溃原因和导致崩溃的节点标题（如有）

---

## 相关文档

- [DOMAIN_RSIP.md](./DOMAIN_RSIP.md) - RSIP 领域文档
- [RSIP_INSIGHTS.md](./RSIP_INSIGHTS.md) - RSIP 分析与推荐
- [RSIP_POLICY_LIBRARY.md](./RSIP_POLICY_LIBRARY.md) - 国策库
