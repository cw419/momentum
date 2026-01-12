# PM-007: 数据库安全策略 (RLS) 问题

**严重程度**: Medium
**影响版本**: new-feature-branch (before commit cb4d3c9)
**修复提交**: `cb4d3c9`, `c11c6c05`, `0683a33`

---

## 1. 概述

数据导入功能在执行时违反了 Supabase 的 Row Level Security (RLS) 策略，导致导入失败。问题根源在于：
1. 导入的数据包含原始用户 ID，与当前用户不匹配
2. RLS 策略阻止用户访问/修改他人数据
3. 不同用户间的数据无法直接导入

## 2. 影响范围

### 用户可见症状
- 导入其他设备/账户的数据失败
- 错误信息：`new row violates row-level security policy`
- 用户无法迁移自己的历史数据

### 影响面
- 多设备用户
- 从本地存储迁移到云端的用户
- 数据备份恢复场景

## 3. 根因分析

### 3.1 RLS 策略工作原理

```sql
-- Supabase 的 RLS 策略示例
CREATE POLICY "Users can only access own chains"
ON chains
FOR ALL
USING (user_id = auth.uid());

-- 这意味着：
-- ✓ 用户 A 可以读/写 user_id = A 的记录
-- ✗ 用户 A 不能读/写 user_id = B 的记录
```

### 3.2 问题场景

```typescript
// 导入数据时（修复前）
const importData = {
  chains: [
    { id: 'xxx', user_id: 'old-user-id', ... },  // ❌ 包含原始用户 ID
  ],
};

await supabase.from('chains').insert(importData.chains);
// 💥 RLS violation: old-user-id != current user
```

### 3.3 更深层的问题

```
1. 用户 ID 被硬编码在导出数据中
2. 链条之间的 parent_id 引用使用原始 ID
3. 历史记录引用原始 chain_id
```

## 4. 修复方案

### 4.1 导入时重写用户 ID

```typescript
// ImportExportModal.tsx - 修复后
async function importChains(data: ExportedData) {
  const currentUserId = auth.uid();

  // ✅ 重写所有 user_id 为当前用户
  const rewrittenChains = data.chains.map(chain => ({
    ...chain,
    user_id: currentUserId,
  }));

  await supabase.from('chains').insert(rewrittenChains);
}
```

### 4.2 ID 映射重建关联

```typescript
// 导入时建立 ID 映射
const idMapping = new Map<string, string>();

// 为每个链条生成新 ID
const rewrittenChains = data.chains.map(chain => {
  const newId = crypto.randomUUID();
  idMapping.set(chain.id, newId);

  return {
    ...chain,
    id: newId,
    user_id: currentUserId,
    // parent_id 稍后更新
  };
});

// 更新 parent_id 引用
const chainsWithParents = rewrittenChains.map(chain => ({
  ...chain,
  parent_id: chain.parent_id ? idMapping.get(chain.parent_id) : null,
}));
```

### 4.3 使用安全的数据库函数

```sql
-- 创建具有 SECURITY DEFINER 的导入函数
CREATE OR REPLACE FUNCTION import_chain_with_new_id(
  p_user_id UUID,
  p_chain_data JSONB
)
RETURNS JSONB
SECURITY DEFINER  -- 以函数创建者权限执行，绕过 RLS
AS $$
DECLARE
  v_new_id UUID := gen_random_uuid();
BEGIN
  -- 验证 p_user_id 是当前用户
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;

  -- 插入数据（使用新 ID 和当前用户 ID）
  INSERT INTO chains (id, user_id, ...)
  VALUES (v_new_id, p_user_id, ...);

  RETURN jsonb_build_object('success', true, 'chain_id', v_new_id);
END;
$$ LANGUAGE plpgsql;
```

## 5. 预防措施

### 5.1 导出数据处理

```typescript
// 导出时移除敏感 ID（可选）
function exportData(): ExportedData {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    chains: chains.map(chain => ({
      ...chain,
      // 不包含 user_id，导入时使用当前用户
      user_id: undefined,
    })),
  };
}
```

### 5.2 编码规范

```
✅ DO:
- 导入数据时重写 user_id 为当前用户
- 使用 ID 映射维护数据关联
- 通过 SECURITY DEFINER 函数处理特权操作

❌ DON'T:
- 直接插入包含其他用户 ID 的数据
- 假设 RLS 策略可以被绕过
- 在客户端禁用 RLS（安全风险）
```

### 5.3 代码审查清单

- [ ] 导入操作是否重写了 user_id？
- [ ] ID 关联（parent_id 等）是否正确映射？
- [ ] 是否使用了 SECURITY DEFINER 函数？
- [ ] 函数内是否验证了用户身份？

### 5.4 测试用例

```typescript
describe('Data import with RLS', () => {
  it('should rewrite user_id to current user', async () => {
    const exportedData = {
      chains: [
        { id: 'old-id', user_id: 'other-user', name: 'Test' },
      ],
    };

    await importData(exportedData);

    const imported = await supabase.from('chains').select('*');
    expect(imported.data[0].user_id).toBe(currentUserId);
  });

  it('should maintain parent-child relationships', async () => {
    const exportedData = {
      chains: [
        { id: 'parent', user_id: 'other', name: 'Parent' },
        { id: 'child', user_id: 'other', name: 'Child', parent_id: 'parent' },
      ],
    };

    await importData(exportedData);

    const parent = await supabase.from('chains').select('*').eq('name', 'Parent').single();
    const child = await supabase.from('chains').select('*').eq('name', 'Child').single();

    expect(child.data.parent_id).toBe(parent.data.id);
  });
});
```

## 6. 相关提交

| Commit | 描述 |
|--------|------|
| `cb4d3c9` | 修复数据导入 RLS 策略违反问题 |
| `c11c6c05` | 解除所有用户 RLS 限制（临时方案） |
| `0683a33` | 不同用户 ID 之间不能导入的问题 |

## 7. 经验教训

> **核心教训**: RLS 是 Supabase 的核心安全机制，不应被绕过，而应该正确适配：
> 1. 理解 RLS 策略如何影响你的操作
> 2. 设计导入/导出格式时考虑 RLS 兼容性
> 3. 使用 SECURITY DEFINER 函数处理特权操作，但要验证用户身份

### RLS 最佳实践

```
1. 默认启用 RLS
   - 新表默认启用 RLS
   - 明确定义访问策略

2. 最小权限原则
   - 用户只能访问自己的数据
   - 共享数据通过明确的策略控制

3. 特权操作隔离
   - 使用 SECURITY DEFINER 函数
   - 函数内验证用户身份
   - 审计特权操作

4. 测试 RLS 策略
   - 测试正常访问路径
   - 测试越权访问被拒绝
```

---

*作者: Postmortem Analysis System*
*日期: 2026-01-12*
