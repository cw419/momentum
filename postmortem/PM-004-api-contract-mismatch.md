# PM-004: 前后端接口不匹配

**严重程度**: Medium
**影响版本**: new-feature-branch (多个版本)
**修复提交**: `7f221a1`, `3fe978d`, `cfd9899`

---

## 1. 概述

前端调用后端 API/RPC 时，参数名称或类型与数据库函数定义不匹配，导致调用失败或数据错误。这类问题通常在集成测试或生产环境才暴露。

## 2. 影响范围

### 问题类型

| 子类型 | 示例 | 影响 |
|--------|------|------|
| 参数名不匹配 | `userId` vs `user_id` | 调用失败 |
| 类型不匹配 | `string` vs `uuid` | 隐式转换错误 |
| 必选/可选不一致 | 前端漏传必选参数 | 400 错误 |
| 返回值结构变化 | 后端改了返回格式 | 前端解析失败 |

### 用户可见症状
- 功能完全不可用
- 控制台显示 400/500 错误
- 数据保存后丢失字段

## 3. 根因分析

### 3.1 案例一：参数名称不匹配

```typescript
// SecureImportService.ts - 修复前
const { error } = await supabase.rpc('import_chain_with_new_id', {
  userId: user.id,        // ❌ 前端用 camelCase
  chainData: chainJson,
});

// 数据库函数定义
CREATE FUNCTION import_chain_with_new_id(
  user_id UUID,           -- ❌ 后端用 snake_case
  chain_data JSONB
)
```

**根因**: JavaScript/TypeScript 习惯用 camelCase，PostgreSQL/Supabase 习惯用 snake_case，无自动转换。

### 3.2 案例二：类型不匹配

```typescript
// 前端传入
const sessionType = 'write';  // string

// 数据库期望
session_type session_type_enum  -- 自定义枚举类型
```

```sql
-- 迁移文件修复
-- 20250906000006_fix_create_write_session_type_mismatch.sql
ALTER FUNCTION create_write_session(...)
  -- 改为接受 TEXT 并在函数内转换
```

### 3.3 案例三：返回值结构

```typescript
// 前端期望
const { success, data } = result;

// 后端实际返回
{ ok: true, value: { ... } }  // 使用 Result 模式
```

## 4. 修复方案

### 4.1 参数名统一映射

```typescript
// 方案 A：前端适配后端命名
const { error } = await supabase.rpc('import_chain_with_new_id', {
  user_id: user.id,        // ✅ 使用 snake_case
  chain_data: chainJson,
});

// 方案 B：创建映射层
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [camelToSnake(k), v])
  );
}
```

### 4.2 类型安全的 RPC 调用

```typescript
// types/supabase.ts - 生成的类型定义
interface Database {
  public: {
    Functions: {
      import_chain_with_new_id: {
        Args: {
          user_id: string;
          chain_data: Json;
        };
        Returns: { success: boolean; chain_id: string };
      };
    };
  };
}

// 使用类型安全的调用
const { data, error } = await supabase
  .rpc<'import_chain_with_new_id'>('import_chain_with_new_id', {
    user_id: user.id,  // TypeScript 会检查参数名和类型
    chain_data: chainJson,
  });
```

### 4.3 迁移兼容处理

```sql
-- 数据库函数支持多种输入格式
CREATE OR REPLACE FUNCTION create_write_session(
  p_session_type TEXT DEFAULT 'write'  -- 接受 TEXT
)
RETURNS ...
AS $$
DECLARE
  v_session_type session_type_enum;
BEGIN
  -- 内部转换为枚举
  v_session_type := p_session_type::session_type_enum;
  -- ...
END;
$$;
```

## 5. 预防措施

### 5.1 类型定义同步策略

```bash
# 使用 Supabase CLI 生成类型定义
npx supabase gen types typescript --project-id $PROJECT_ID > src/types/supabase.ts

# 在 CI 中检查类型定义是否过期
npm run typecheck
```

### 5.2 编码规范

```
✅ DO:
- 使用生成的 Supabase 类型定义
- RPC 调用参数使用 snake_case（匹配 PostgreSQL 习惯）
- 返回值解构时检查实际结构

❌ DON'T:
- 手写 API 参数名（容易拼错）
- 假设前后端命名风格一致
- 忽略数据库迁移对 API 的影响
```

### 5.3 代码审查清单

- [ ] RPC 参数名是否与数据库函数参数名一致？
- [ ] 参数类型是否兼容（特别是枚举类型）？
- [ ] 是否使用了类型安全的调用方式？
- [ ] 数据库迁移是否更新了对应的 TypeScript 类型？

### 5.4 集成测试覆盖

```typescript
// 对每个 RPC 函数编写集成测试
describe('import_chain_with_new_id', () => {
  it('should accept valid parameters', async () => {
    const result = await supabase.rpc('import_chain_with_new_id', {
      user_id: testUserId,
      chain_data: validChainJson,
    });

    expect(result.error).toBeNull();
    expect(result.data.success).toBe(true);
  });

  it('should reject invalid user_id format', async () => {
    const result = await supabase.rpc('import_chain_with_new_id', {
      user_id: 'not-a-uuid',
      chain_data: validChainJson,
    });

    expect(result.error).not.toBeNull();
  });
});
```

## 6. 相关提交

| Commit | 描述 |
|--------|------|
| `7f221a1` | 修复参数名称不匹配：userId → user_id |
| `3fe978d` | 修复 session type 类型不匹配 |
| `cfd9899` | 解决 types/index.ts 合并冲突 |

## 7. 经验教训

> **核心教训**: 前后端接口是"契约"，任何一方的变更都必须双向同步。推荐：
> 1. 使用代码生成保持类型同步
> 2. API 变更必须同时更新前后端
> 3. 集成测试覆盖所有 RPC 调用

### API 契约管理最佳实践

```
1. Schema First (模式优先)
   - 先定义 API 契约（OpenAPI/GraphQL Schema）
   - 前后端从同一来源生成代码

2. Type Generation (类型生成)
   - supabase gen types 生成 TypeScript 类型
   - 数据库迁移后立即重新生成

3. Contract Testing (契约测试)
   - 测试 API 的输入输出是否符合预期
   - 在 CI 中运行，防止回归
```

---

*作者: Postmortem Analysis System*
*日期: 2026-01-12*
