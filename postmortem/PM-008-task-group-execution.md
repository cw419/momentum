# PM-008: 任务群执行逻辑 Bug

**严重程度**: High
**影响版本**: new-feature-branch (before commits a7b193f, 0e133b3)
**修复提交**: `a7b193f`, `f7c0a81`, `a7a5711`, `0e133b3`, `9f096ae`

---

## 1. 概述

任务群（Group Chain）功能存在多个相关 Bug：
1. 任务群只能执行两个子任务就停止
2. 任务群没有可执行的子任务
3. 任务群无法重复执行

这些问题的根源在于子任务查找逻辑和状态更新逻辑的缺陷。

## 2. 影响范围

### 用户可见症状
- 创建了包含 5 个子任务的任务群，只能执行 2 个
- 点击"开始任务群"提示"没有可执行的子任务"
- 完成任务群后无法再次执行

### 影响面
- 使用任务群功能的核心用户
- 项目的核心功能（CTDP 方法论的关键特性）

## 3. 根因分析

### 3.1 Bug 1: 只能执行两个子任务

```typescript
// chainTree.ts - 修复前
function getNextExecutableTask(group: GroupChain, chains: Chain[]): Chain | null {
  const children = chains.filter(c => c.parentId === group.id);

  // ❌ 只检查了第一个子任务的状态
  for (const child of children) {
    if (!child.completed) {
      return child;
    }
    break;  // ❌ 错误的 break，第一次循环后就退出
  }

  return null;
}
```

### 3.2 Bug 2: 没有可执行的子任务

```typescript
// 问题：子任务查找使用了错误的父级引用
function findChildren(parentId: string, chains: Chain[]): Chain[] {
  // ❌ parentId 可能是 undefined 而非 null
  return chains.filter(c => c.parentId === parentId);
}

// 实际数据中：
// { id: 'child1', parentId: undefined }  // 未设置 parentId
// { id: 'child2', parentId: null }        // 明确设置为 null
// 两者不相等，导致查找失败
```

### 3.3 Bug 3: 无法重复执行

```typescript
// App.tsx - 修复前
const handleStartGroupTask = (groupId: string) => {
  const group = chains.find(c => c.id === groupId);

  // ❌ 没有重置子任务的完成状态
  if (group?.type === 'group') {
    startTask(group);
  }
};
```

### 3.4 状态更新问题

```typescript
// 修复前：状态更新可能丢失
setState(prev => {
  const updated = { ...prev };
  // ❌ 多层嵌套更新可能不触发重渲染
  updated.chains[0].children[0].completed = true;
  return updated;
});
```

## 4. 修复方案

### 4.1 修复子任务遍历逻辑

```typescript
// chainTree.ts - 修复后
function getNextExecutableTask(group: GroupChain, chains: Chain[]): Chain | null {
  const children = getChildChains(group.id, chains);

  // ✅ 正确遍历所有子任务
  for (const child of children) {
    if (!child.completed) {
      return child;
    }
    // ✅ 移除错误的 break，继续检查下一个
  }

  return null;  // 所有子任务都已完成
}
```

### 4.2 修复子任务查找

```typescript
// chainTree.ts
function getChildChains(parentId: string, chains: Chain[]): Chain[] {
  return chains.filter(c => {
    // ✅ 同时处理 undefined 和 null
    const childParentId = c.parentId ?? null;
    const targetParentId = parentId ?? null;
    return childParentId === targetParentId;
  });
}
```

### 4.3 添加重置功能

```typescript
// App.tsx / useChainsDomain.ts - 修复后
const handleStartGroupTask = (groupId: string) => {
  setState(prev => {
    // ✅ 重置所有子任务的完成状态
    const resetChains = prev.chains.map(chain => {
      if (chain.parentId === groupId) {
        return { ...chain, completed: false };
      }
      return chain;
    });

    return { ...prev, chains: resetChains };
  });

  startTask(groupId);
};
```

### 4.4 确保状态更新触发重渲染

```typescript
// 正确的不可变更新
setState(prev => ({
  ...prev,
  chains: prev.chains.map(chain =>
    chain.id === targetId
      ? { ...chain, completed: true }  // ✅ 创建新对象
      : chain
  ),
}));
```

## 5. 预防措施

### 5.1 编码规范

```
✅ DO:
- for 循环中谨慎使用 break/continue
- 处理 null 和 undefined 的区别
- 状态更新使用不可变方式
- 复杂逻辑编写单元测试

❌ DON'T:
- 假设 null === undefined
- 在循环中意外使用 break
- 直接修改 state 对象
- 跳过边界条件测试
```

### 5.2 代码审查清单

- [ ] 循环中的 break/continue 是否有意为之？
- [ ] 是否正确处理了 null 和 undefined？
- [ ] 状态更新是否使用了不可变方式？
- [ ] 是否有对应的单元测试？

### 5.3 测试用例

```typescript
describe('Task Group Execution', () => {
  it('should execute all child tasks in sequence', () => {
    const group = createGroup('Group 1');
    const children = [
      createTask('Task 1', group.id),
      createTask('Task 2', group.id),
      createTask('Task 3', group.id),
    ];

    // 模拟执行流程
    let executedCount = 0;
    while (true) {
      const next = getNextExecutableTask(group, children);
      if (!next) break;

      markAsCompleted(next);
      executedCount++;
    }

    expect(executedCount).toBe(3);  // ✅ 应该执行所有 3 个任务
  });

  it('should allow re-execution after reset', () => {
    const group = createGroup('Group 1');
    const children = [createTask('Task 1', group.id)];

    // 第一次执行
    completeGroup(group, children);
    expect(getNextExecutableTask(group, children)).toBeNull();

    // 重置
    resetGroup(group, children);

    // 第二次执行
    const next = getNextExecutableTask(group, children);
    expect(next).not.toBeNull();  // ✅ 重置后应该可以再次执行
  });
});
```

### 5.4 边界条件测试

```typescript
describe('Edge Cases', () => {
  it('should handle empty group', () => {
    const group = createGroup('Empty');
    const next = getNextExecutableTask(group, []);
    expect(next).toBeNull();
  });

  it('should handle undefined parentId', () => {
    const children = [{ id: '1', parentId: undefined }];
    const result = getChildChains(null, children);
    expect(result).toHaveLength(1);  // undefined 应该匹配 null
  });
});
```

## 6. 相关提交

| Commit | 描述 |
|--------|------|
| `a7b193f` | 继续修复任务群只能执行两个子任务的问题 |
| `f7c0a81` | 继续修复不能重复执行任务群的问题 |
| `a7a5711` | 修复不能重复执行任务群的问题 |
| `0e133b3` | 修复任务群没有子任务可执行的问题 |
| `9f096ae` | 修复任务群只能完成两个子任务的问题 |

## 7. 经验教训

> **核心教训**: 看似简单的循环和条件判断也可能隐藏 Bug：
> 1. **循环控制流**：`break` 和 `continue` 的位置影响巨大
> 2. **相等性比较**：`null` vs `undefined` vs `''` 是不同的
> 3. **状态不可变**：React 依赖引用变化来触发重渲染
>
> 复杂业务逻辑必须有单元测试覆盖。

### 调试此类问题的方法

```typescript
// 1. 添加详细日志
function getNextExecutableTask(group, chains) {
  logger.debug('TASK_GROUP', 'Finding next task', {
    groupId: group.id,
    childCount: getChildChains(group.id, chains).length,
  });

  for (const child of children) {
    logger.debug('TASK_GROUP', 'Checking child', {
      childId: child.id,
      completed: child.completed,
    });
    // ...
  }
}

// 2. 编写复现测试
// 先写一个失败的测试来复现 bug，然后修复使其通过

// 3. 使用调试器
// 在关键位置设置断点，单步执行观察变量
```

---

*作者: Postmortem Analysis System*
*日期: 2026-01-12*
