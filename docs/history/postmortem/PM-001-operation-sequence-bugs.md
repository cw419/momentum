# PM-001: 操作顺序依赖 Bug

**严重程度**: Critical
**影响版本**: new-feature-branch (before commit 764f184)
**修复提交**: `764f184`, `472fa81`

---

## 1. 概述

押注系统中存在一个致命的操作顺序 bug：任务完成时，前端先清理了 `active_sessions`，然后才调用押注结算 RPC。但数据库触发器会在 session 被删除时自动将 pending bet 退款（refund），导致后续的结算调用找不到 session，押注永远无法正常结算（赢/输），用户"今日已押"永远显示 0。

## 2. 影响范围

### 用户可见症状

- 押注成功后，无论任务成功还是失败，积分都不变
- "今日已押"统计始终显示 0
- 用户认为押注功能"完全坏了"

### 影响面

- 所有使用押注功能的用户
- 核心 Gamification 功能失效
- 用户信任度下降

## 3. 根因分析

### 3.1 问题代码（修复前）

```typescript
// useSessionsDomain.ts - 修复前的错误顺序
const completeTask = async () => {
  // ... 保存链条数据 ...

  // ❌ 错误：先清理 active session
  await storage.saveActiveSession(null); // 这会 DELETE active_sessions 记录

  // ❌ 此时数据库触发器已经把 pending bet 退款了

  // ❌ 后调用结算 RPC —— 但 session 已经不存在了
  await storage.completeTaskWithBetting(activeSessionId, true, '任务完成');
};
```

### 3.2 数据库触发器逻辑

```sql
-- 20250906000002_fix_bet_settlement_on_session_completion.sql
-- 当 active_sessions 被删除时，自动退款 pending bets
CREATE TRIGGER on_active_session_delete
AFTER DELETE ON active_sessions
FOR EACH ROW
EXECUTE FUNCTION refund_pending_bets_on_session_delete();
```

### 3.3 时序图

```
修复前（错误顺序）：
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │   Supabase DB   │     │    Triggers     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ DELETE active_sessions│                       │
         │──────────────────────>│                       │
         │                       │ on_delete trigger     │
         │                       │──────────────────────>│
         │                       │                       │ refund_pending_bets()
         │                       │<──────────────────────│
         │                       │                       │
         │ CALL complete_task_with_betting              │
         │──────────────────────>│                       │
         │                       │ ERROR: session not found
         │<──────────────────────│                       │
         │                       │                       │
```

### 3.4 附加问题：Session ID 不一致

押注启动时创建一个 betting session（生成新 ID），而开始任务时又创建一个 active session（又生成新 ID）。两个 ID 不一致导致结算时找不到正确的 session。

## 4. 修复方案

### 4.1 调整操作顺序

```typescript
// useSessionsDomain.ts - 修复后的正确顺序
const completeTask = async () => {
  // ... 保存链条数据 ...

  // ✅ 先结算押注
  const result = await storage.completeTaskWithBetting(
    sessionIdToSettle,
    true,
    '任务完成',
  );

  // ✅ 检查结算是否真正成功
  const settledOk = result.ok && result.value?.success === true;
  if (!settledOk) {
    toast.warning('押注结算失败，积分可能未更新');
  }

  // ✅ 最后才清理 active session
  await storage.saveActiveSession(null);
};
```

### 4.2 Session ID 复用

```typescript
// 开始任务时复用 betting session ID
const bettingSessionId = pendingChainId === chainId ? currentSessionId : null;

const activeSession: ActiveSession = {
  ...(bettingSessionId ? { id: bettingSessionId } : {}), // ✅ 复用 ID
  chainId,
  startedAt: new Date(),
  // ...
};
```

### 4.3 增强错误提示

```typescript
// 不再静默失败，给用户明确反馈
if (!settledOk) {
  toast.warning(
    tr(
      '押注结算失败，积分可能未更新（数据库可能只读）',
      'Bet settlement failed; points may not update (database may be read-only).',
    ),
  );
}
```

## 5. 预防措施

### 5.1 编码规范

```
✅ DO:
- 涉及多个异步操作时，明确绘制时序图
- 副作用操作（DELETE/UPDATE）放在业务逻辑之后
- 对有数据库触发器的表操作要格外小心顺序

❌ DON'T:
- 假设"清理"操作是无害的可以提前执行
- 忽略数据库触发器的隐式副作用
- 在不了解后端触发器逻辑的情况下修改操作顺序
```

### 5.2 代码审查清单

- [ ] 涉及多个数据库操作时，是否考虑了操作顺序？
- [ ] 是否存在数据库触发器可能改变预期行为？
- [ ] 清理/删除操作是否放在了业务逻辑完成之后？
- [ ] ID 在多个流程间传递时是否保持一致？

### 5.3 测试建议

```typescript
// 集成测试应覆盖完整流程
test('betting settlement should work when task completes', async () => {
  // 1. 创建押注
  const betResult = await createBet(userId, chainId, amount);

  // 2. 开始任务
  await startTask(chainId);

  // 3. 完成任务
  await completeTask(chainId);

  // 4. 验证积分变化
  const points = await getUserPoints(userId);
  expect(points).not.toBe(initialPoints); // 积分应该有变化
});
```

## 6. 相关提交

| Commit    | 描述                                             |
| --------- | ------------------------------------------------ |
| `764f184` | 主要修复：调整结算顺序，复用 session ID          |
| `472fa81` | 增强错误处理：写入失败抛错并 toast               |
| `66b08b3` | 早期修复尝试：修复押注成功后没有收到奖励         |
| `982034a` | 早期修复尝试：修复 session ID 格式问题           |
| `4ef2177` | 早期修复尝试：继续修复 database error in betting |

## 7. 经验教训

> **核心教训**: 当系统涉及"状态清理"操作时，永远要问：
>
> 1. 清理会触发什么隐式副作用（触发器、级联删除）？
> 2. 清理之前的数据是否还被其他操作依赖？
> 3. 清理失败会造成什么后果？

---

_作者: Postmortem Analysis System_
_日期: 2026-01-12_
