# PM-002: React 事件对象泄漏 Bug

**严重程度**: High
**影响版本**: new-feature-branch (before commit 983b796)
**修复提交**: `983b796`

---

## 1. 概述

Dashboard 的"新建链"按钮的 `onClick` 处理函数设计为接收可选的 `parentId` 参数，但 React 会自动将 click 事件对象作为第一个参数传入。当用户直接点击按钮时，事件对象（包含 `Window` 引用）被误当作 `parentId`，在写入 Supabase 时 `JSON.stringify` 遇到循环引用直接崩溃。

## 2. 影响范围

### 用户可见症状

- 点击"新建链"按钮后控制台报错：`Converting circular structure to JSON`
- 链条创建失败
- 用户误以为是 Supabase "只读"问题

### 影响面

- 所有尝试创建新链条的用户
- 新用户首次使用体验极差

## 3. 根因分析

### 3.1 问题代码（修复前）

```tsx
// Dashboard.tsx
<Button onClick={handleCreateChain}>新建链</Button>;

// useChainsDomain.ts - 修复前
const handleCreateChain = (parentId?: string | null) => {
  setState((prev) => ({
    ...prev,
    currentView: 'editor',
    viewingChainId: parentId ?? null, // ❌ parentId 实际是 React.MouseEvent
  }));
};
```

### 3.2 React 事件传递机制

```typescript
// React 会这样调用 onClick 处理函数：
onClick={(event) => handleCreateChain(event)}

// 所以 parentId 实际收到的是：
{
  type: 'click',
  target: HTMLButtonElement,
  currentTarget: HTMLButtonElement,
  nativeEvent: MouseEvent,
  view: Window,  // ← 循环引用的来源
  // ...
}
```

### 3.3 崩溃点

```typescript
// 在写入 Supabase 时
const chainData = {
  id: 'xxx',
  parentId: event, // ← 这里是事件对象
  // ...
};

JSON.stringify(chainData); // 💥 TypeError: Converting circular structure to JSON
```

### 3.4 为什么是"循环引用"

```
Event 对象结构：
event
  └── view: Window
        └── document: Document
              └── defaultView: Window  ← 回到 Window，形成循环
```

## 4. 修复方案

### 4.1 参数类型校验（第一层防护）

```typescript
// useChainsDomain.ts - 修复后
const handleCreateChain = (parentId?: unknown) => {
  // ✅ 只接受字符串，其他类型（包括事件对象）一律当作 null
  const normalizedParentId = typeof parentId === 'string' ? parentId : null;

  setState((prev) => ({
    ...prev,
    currentView: 'editor',
    viewingChainId: normalizedParentId,
  }));
};
```

### 4.2 数据映射层校验（第二层防护）

```typescript
// mappers.ts
export function chainToRow(chain: Chain): ChainRow {
  return {
    // ...
    // ✅ 强制类型转换，防止非字符串值进入数据库
    parent_id: typeof chain.parentId === 'string' ? chain.parentId : null,
  };
}
```

### 4.3 序列化错误短路（第三层防护）

```typescript
// useSafeSaveChains.ts
const safelySaveChains = async (chains: Chain[]) => {
  try {
    await storage.saveChains(chains);
  } catch (error) {
    // ✅ 检测序列化错误，不重试（重试也会失败）
    if (isSerializationError(error)) {
      logger.error('CHAINS', 'Serialization error - not retrying', { error });
      return; // 直接放弃，不刷屏
    }
    // 其他错误正常重试...
  }
};

// errorMessage.ts
function isSerializationError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes('circular structure') ||
    message.includes('Converting circular')
  );
}
```

## 5. 预防措施

### 5.1 编码规范

```
✅ DO:
- 事件处理函数如果接收自定义参数，使用箭头函数包装
- 对外部输入（包括函数参数）进行类型校验
- 在数据持久化边界做最终校验

❌ DON'T:
- 直接把可能接收事件的函数用于 onClick
- 假设函数参数类型总是正确的
- 让非预期对象进入 JSON.stringify
```

### 5.2 正确的事件处理写法

```tsx
// ❌ 错误写法 - 事件对象会被传入
<Button onClick={handleCreateChain}>新建链</Button>

// ✅ 正确写法 1 - 使用箭头函数隔离事件
<Button onClick={() => handleCreateChain()}>新建链</Button>

// ✅ 正确写法 2 - 如果需要传参
<Button onClick={() => handleCreateChain(someParentId)}>新建链</Button>

// ✅ 正确写法 3 - 函数内部校验（本次采用的方案）
const handleCreateChain = (parentId?: unknown) => {
  const safeParentId = typeof parentId === 'string' ? parentId : null;
  // ...
};
```

### 5.3 代码审查清单

- [ ] onClick/onChange 等事件处理函数是否会误收事件对象？
- [ ] 函数参数是否做了类型校验？
- [ ] 数据持久化前是否有最终的类型保障？
- [ ] JSON.stringify 的对象是否可能包含 DOM 引用？

### 5.4 TypeScript 类型提示

```typescript
// 更严格的类型定义可以在编译期发现问题
interface CreateChainHandler {
  (parentId: string): void;
  (): void;
}

// 但 React 事件类型兼容性问题可能需要 unknown + runtime check
```

## 6. 相关提交

| Commit    | 描述                                         |
| --------- | -------------------------------------------- |
| `983b796` | 主要修复：三层防护避免 event/window 进入写入 |
| `154340b` | 早期相关：正确初始化 ChainEditor 的 parentId |

## 7. 经验教训

> **核心教训**: React 事件处理函数的第一个参数永远是事件对象。如果你的函数设计为接收其他类型的参数，必须：
>
> 1. 使用箭头函数包装调用
> 2. 或在函数内部做类型校验
>
> 这是一个容易被忽视但影响很大的"默认行为陷阱"。

### 防御性编程原则

```typescript
// 边界输入永远不可信
function processUserInput(input: unknown): SafeType {
  // 1. 类型检查
  if (typeof input !== 'string') {
    return DEFAULT_VALUE;
  }

  // 2. 格式验证
  if (!isValidFormat(input)) {
    return DEFAULT_VALUE;
  }

  // 3. 安全转换
  return sanitize(input);
}
```

---

_作者: Postmortem Analysis System_
_日期: 2026-01-12_
