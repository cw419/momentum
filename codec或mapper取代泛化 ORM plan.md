# 共享序列化 Codec 计划

## Context

当前 localStorage 和 Supabase 两条存储路径各自维护独立的反序列化逻辑，导致：

- **5 个 `as unknown as` 强转**（`src/utils/storage/rsip.ts:124,138,162,181,195`）— 将 `JSON.parse` 结果直接 spread 为类型化对象，绕过所有类型检查
- **重复的日期解析** — local `parseDate()` vs supabase `asDate()`，各处还有裸 `new Date(string)` 无校验
- **零散的默认值填充** — chains `auxiliaryStreak || 0`、sessions `auxiliarySignal || '预约信号'` 等分散在各文件
- **不完整的 Raw 类型** — chains/sessions/history 只定义了部分字段的 Raw interface，其余靠 `Record<string, unknown>` 兜底

**Pet 是参考范本**：`SerializedPetState` 显式定义了所有字段（dates as string），decode/encode 用 spread + 覆写日期，零强转。

## 目标

- 消除 rsip.ts 中 5 个 `as unknown as` + 1 个 `as RSIPMeta` + sessions.ts 1 个 `as ActiveSession`（共 7 个）
- 统一 Date / optional / default 处理为共享 primitives
- local 和 supabase 两侧共享编解码原语，不引入泛化 ORM

## 新增模块：`src/storage/codecs/`

### Step 1: `src/storage/codecs/primitives.ts` (~50 行)

共享的编解码原语，替代散落各处的 `parseDate` / `asDate` / `sanitize*`：

```typescript
// Decode（JSON → 领域类型）
export function toDate(value: string): Date
export function toOptionalDate(value: unknown): Date | undefined
export function toDateWithFallback(value: unknown, fallback: Date): Date

// Encode（领域类型 → JSON 安全值）
export function toIsoString(date: Date): string
export function toOptionalIsoString(date: Date | undefined | null): string | null

// 通用 sanitizer（对 local JSON.stringify 和 supabase payload 均适用）
export function sanitizeString(value: unknown, fallback?: string): string
export function sanitizeInt(value: unknown, fallback: number): number
export function sanitizeBool(value: unknown, fallback: boolean): boolean
export function sanitizeStringArray(value: unknown): string[]
```

`toOptionalDate` 统一替换 `rsip.ts:109-117` 的 `parseDate()` 和 `supabase/rsip.ts` 的 `asDate()`。

### Step 2: `src/storage/codecs/rsipCodec.ts` (~130 行)

为 5 个有强转的 RSIP 实体 + RSIPMeta 定义 Serialized 接口和 decode 函数：

| Serialized 接口 | 对应领域类型 | Date 字段 |
|---|---|---|
| `SerializedRSIPNodeGroup` | `RSIPNodeGroup` | `createdAt` |
| `SerializedRSIPLibraryEntry` | `RSIPLibraryEntry` | `lastActiveAt` |
| `SerializedRSIPRunRecord` | `RSIPRunRecord` | `startedAt`, `endedAt?` |
| `SerializedRSIPTaskLink` | `RSIPTaskLink` | `updatedAt` |
| `SerializedRSIPExecutionRecord` | `RSIPExecutionRecord` | `executedAt` |
| `SerializedRSIPMeta` | `RSIPMeta` | `lastAddedAt?`, `lastTreeOpenedAt?`, `currentRunStartedAt?` |

每个 decode 函数做 spread + 日期覆写（和 Pet 完全一致的模式）：

```typescript
export function decodeRSIPNodeGroup(raw: SerializedRSIPNodeGroup): RSIPNodeGroup {
  return { ...raw, createdAt: toDateWithFallback(raw.createdAt, new Date()) };
}
```

### Step 3: `src/storage/codecs/chainCodec.ts` (~70 行)

- `SerializedChainRecord` — 所有字段显式列出，Date 字段为 `string | null`
- `decodeChain(raw: SerializedChainRecord): Chain` — 分支 `type === 'group'` 保持 discriminated union
- 内联 default：`auxiliaryStreak ?? 0`、`auxiliaryFailures ?? 0`、`auxiliaryExceptions ?? []`

### Step 4: `src/storage/codecs/sessionCodec.ts` (~50 行)

- `SerializedScheduledSession` + `decodeScheduledSession`
- `SerializedActiveSession` + `decodeActiveSession`
- `SerializedCompletionHistory` + `decodeCompletionHistory`
- 默认值：`auxiliarySignal ?? '预约信号'`、`isForwardTimer ?? false`、`forwardElapsedTime ?? 0`

### Step 5: `src/storage/codecs/index.ts` — barrel 导出

## 改写现有文件

### Step 6: 改写 `src/utils/storage/rsip.ts`

改写前（5 处相同模式）:
```typescript
return (JSON.parse(data) as Record<string, unknown>[]).map((group) => ({
  ...(group as unknown as RSIPNodeGroup),
  createdAt: parseDate(group, 'createdAt') ?? new Date(),
}));
```

改写后:
```typescript
return (JSON.parse(data) as SerializedRSIPNodeGroup[]).map(decodeRSIPNodeGroup);
```

同时：
- `getRSIPMeta()` 使用 `decodeRSIPMeta`，消除 `as RSIPMeta` 强转
- `getRSIPNodes()` 使用 `toOptionalDate` 替代内联 `typeof` 检查
- 删除本地 `parseDate()` 函数

### Step 7: 改写 `src/utils/storage/chains.ts`

- `getChains()` 使用 `decodeChain`，删除 `RawChainData` 接口

### Step 8: 改写 `src/utils/storage/sessions.ts` + `history.ts`

- `getScheduledSessions()` 使用 `decodeScheduledSession`，删除 `RawSessionData`
- `getActiveSession()` 使用 `decodeActiveSession`，消除 `as ActiveSession` 强转
- `getCompletionHistory()` 使用 `decodeCompletionHistory`，删除 `RawHistoryData`

### Step 9: Supabase 侧共享 primitives

- `src/infra/storage/supabase/mappers.ts` — 从 `buildChainRow()` 中提取 `sanitize*` 系列，改为 import `primitives.ts`，函数体减少 ~35 行
- `src/infra/storage/supabase/rsip.ts` — 删除本地 `asDate()` 函数，改用 `toOptionalDate`

### Step 10: 测试

- 新增 `src/storage/codecs/__tests__/primitives.test.ts` — 覆盖 toDate / toOptionalDate / toDateWithFallback / sanitize 系列
- 新增 `src/storage/codecs/__tests__/rsipCodec.test.ts` — 覆盖各 decode 函数（正常数据、缺失日期、非法日期）
- 现有测试（`src/utils/storage/__tests__/`）通过公共 API 测试行为，不需改动，应当继续通过

## 不做的事

- **不碰 Pet** — 已经是标准模式
- **不碰 taskTimeStats** — 无日期字段，无强转
- **不引入 zod/io-ts** — `JSON.parse() as SerializedX` 模式已足够（与 Pet 一致）
- **不统一 Supabase column mapping** — snake_case ↔ camelCase 仍由各 mapper 自行处理
- **不写 encode 函数** — `JSON.stringify(entity)` 依赖 `Date.toJSON()` 返回 ISO string，现行方式已可用；RSIPMeta 的手动 encode 保持不动

## 关键文件清单

| 文件 | 操作 |
|---|---|
| `src/storage/codecs/primitives.ts` | **新建** |
| `src/storage/codecs/rsipCodec.ts` | **新建** |
| `src/storage/codecs/chainCodec.ts` | **新建** |
| `src/storage/codecs/sessionCodec.ts` | **新建** |
| `src/storage/codecs/index.ts` | **新建** |
| `src/utils/storage/rsip.ts` | **改写** — 消除 5 个 `as unknown as` + 1 个 `as RSIPMeta` |
| `src/utils/storage/chains.ts` | **改写** — 使用 decodeChain |
| `src/utils/storage/sessions.ts` | **改写** — 消除 `as ActiveSession` |
| `src/utils/storage/history.ts` | **改写** — 使用 decodeCompletionHistory |
| `src/infra/storage/supabase/mappers.ts` | **改写** — 提取 sanitize 系列到 primitives |
| `src/infra/storage/supabase/rsip.ts` | **改写** — 删除 asDate，用 toOptionalDate |
| `src/storage/codecs/__tests__/primitives.test.ts` | **新建** |
| `src/storage/codecs/__tests__/rsipCodec.test.ts` | **新建** |
| `src/types/pet.ts` | 不动（参考范本） |
| `src/utils/storage/pet.ts` | 不动（参考范本） |

## 验证

1. `npm run typecheck` — 无类型错误
2. `npm run lint` — 无新 lint 警告
3. `npx vitest run src/utils/storage` — 现有 localStorage 测试全部通过
4. `npx vitest run src/storage/codecs` — 新 codec 测试通过
5. `npm test` — CI smoke tests 通过
6. 手动确认：grep `as unknown as` 在 `src/utils/storage/` 下计数归零
