# Momentum 架构改进建议

## Context

从架构师角度对 Momentum (~20K LOC, React 18 + TypeScript 5.9 + Vite 7 + Supabase + Tauri v2) 进行全面审计后，识别出以下改进方向。项目整体质量很高（纯净的三层架构、Result<T,E> 模式、85%+ 突变分数、零循环依赖），以下建议聚焦于 ROI 最高的结构性改进。

---

## 1. 状态管理：引入 Zustand 替代 prop drilling（优先级最高）

**问题**: `AppShellContainer` 持有单一 `useState<AppState>`，导致：
- `AppShellViewProps` 有 **55+ 个 prop**（`src/app/app-shell/types.ts`，171 行）
- 12+ 个 domain hook 接收 `setState` 回调，任何状态变化触发整棵组件树重渲染
- 手动 `chainsRevision` 计数器作为过期检测的 hack

**方案**: 引入 Zustand (~1KB gzipped)，按领域切分 store：

```
src/stores/
  chainsStore.ts         — chains, editingChain, viewingChainId
  sessionsStore.ts       — scheduledSessions, activeSession
  rsipStore.ts           — rsipNodes, rsipMeta, rsipGroups 等
  uiStore.ts             — currentView, showBettingModal, showAuxiliaryJudgment
```

**收益**: 消除 prop drilling、删除 chainsRevision hack、选择器级精准重渲染
**工作量**: 中等（可逐 store 增量迁移）| **影响**: 高

---

## 2. 数据访问层：声明式 Mapper 工厂（而非传统 ORM）

**为什么不用 ORM**:
- Drizzle/Prisma 不支持 `MomentumStorage` 的双模式（localStorage + Supabase REST API）
- Prisma 需要 Node.js runtime，与 Tauri/浏览器不兼容
- Supabase 已自动生成 `database.types.ts`，ORM 会重复这层类型

**问题**: `mappers.ts`（171 行）逐字段手写映射 + 5 个 sanitize 函数；`rsip.ts` 有 5 个 `as unknown as` 强转；Date 序列化逻辑在 localStorage 和 Supabase 路径中重复。

**方案**: 创建零依赖的 `EntityMapper<Domain, Row>` 工厂：

```typescript
// src/infra/storage/mapperFactory.ts
const chainMapper = createEntityMapper<Chain, ChainRow>({
  fields: [
    { domain: 'currentStreak', row: 'current_streak', type: 'int', default: 0 },
    { domain: 'createdAt',     row: 'created_at',     type: 'date' },
    { domain: 'deletedAt',     row: 'deleted_at',     type: 'date?' },
    { domain: 'exceptions',    row: 'exceptions',     type: 'string[]' },
    // ...
  ],
});
// chainMapper.toDomain(row) / chainMapper.toRow(chain, userId)
```

**关键文件**:
- `src/infra/storage/supabase/mappers.ts` — 替换为声明式配置
- `src/utils/storage/chains.ts` — 复用同一 mapper 的 toDomain 逻辑
- `src/infra/storage/supabase/rsip.ts` — 消除 5 个 `as unknown as` 强转

**收益**: 减少 ~60% mapper 样板代码、消除生产代码中的类型强转、新实体只需声明配置
**工作量**: 中等 | **影响**: 中高

---

## 3. RSIP 大文件分解

**问题**: 两个文件远超 300 行预算：
- `src/components/RSIPView.tsx` — 878 行 (2.9x)
- `src/hooks/domains/useRsipDomain.ts` — 755 行 (2.5x)

**方案**: 参照 `useSessionsDomain.ts`（120 行）已有的拆分模式：

```
src/hooks/domains/rsip/
  useRsipDomain.ts        — 薄编排层 (<150 行)
  nodeOperations.ts        — markExecuted, markViolated, reinforceNode
  libraryOperations.ts     — restoreFromLibrary, policy library CRUD
  groupOperations.ts       — createGroup, group management
  saveOperations.ts        — saveNodes, saveMeta, saveGroups 等

src/components/rsip/
  RSIPView.tsx             — 路由/外壳 (<150 行)
  RSIPNodeList.tsx          — 节点树渲染
  RSIPGroupPanel.tsx        — 分组管理 UI
  RSIPPolicyLibrary.tsx     — 策略库视图
```

**收益**: 降低认知负担、使质量门通过、使 RSIP 变更更安全
**工作量**: 低-中（机械式提取，无逻辑变更）| **影响**: 中

---

## 4. Schema Fallback 统一

**问题**: Schema 兼容性检测模式在多处独立重复：
- `rsip.ts` 中的 `RSIP_NODES_STRICT_COLUMNS_SUPPORTED` WeakMap
- `rsip.ts` 中的 `RSIP_META_STRICT_COLUMNS_SUPPORTED` WeakMap
- `sessions.ts` 中的 `hasKnownMissingForwardTimerCapabilities`
- `SupabaseStorageContext` 上已有通用 `schemaCapabilityCache`，但各模块未统一使用

**方案**: 统一到一个 `withSchemaFallback()` 辅助函数：

```typescript
async function withSchemaFallback<T>(
  ctx: SupabaseStorageContext,
  table: string, capability: string,
  primaryQuery: () => Promise<T>,
  fallbackQuery: () => Promise<T>,
): Promise<T>
```

**收益**: 消除重复的错误处理、新表/列的 fallback 只需一行声明
**工作量**: 低 (0.5-1 天) | **影响**: 中

---

## 5. 类型安全：重新生成 database.types.ts

**问题**: `database.types.ts` 未包含较新的 RSIP 列（emoji, type, group_id, stability metrics），迫使 `rsip.ts` 使用 `as unknown as Record<string, unknown>` 访问这些字段。

**方案**: 运行 `npx supabase gen types typescript` 从当前 schema 重新生成类型文件。

**收益**: 立即消除生产代码中 5 个 Supabase 侧的 `as unknown as` 强转
**工作量**: 低 (< 0.5 天) | **影响**: 低-中

---

## 6. MomentumStorage 接口拆分（可选/长期）

**问题**: 接口有 40+ 方法，混合了双模式功能和 Supabase-only 功能。localStorage adapter 有 12 个方法返回 `notSupported()`。

**方案**: 拆分为可组合接口：

```typescript
interface CoreStorage { /* chains, sessions, RSIP, pet — 双模式 */ }
interface AuthStorage { /* signIn, signOut, getCurrentUser — Supabase only */ }
interface GamificationStorage { /* betting, checkin — Supabase only */ }
type MomentumStorage = CoreStorage & Partial<AuthStorage> & Partial<GamificationStorage>;
```

**收益**: 接口契约诚实、localStorage adapter 不再需要 stub 方法
**工作量**: 中 | **影响**: 中（对当前规模来说，现有 `storage.kind` 检查也够用）

---

## 不需要改进的方面

| 方面 | 评估 | 原因 |
|------|------|------|
| 服务层（106 个文件） | 无需合并 | 每功能区约 6 个服务，命名清晰，SystemRuntime facade 统一入口 |
| 领域层纯净度 | 优秀 | src/domain/ 零 React 依赖、零基础设施导入 |
| 存储层隔离 | 优秀 | 所有 `.from()` 调用限制在 src/infra/storage/ 内 |
| CI/CD 管线 | 9/10 | 4 条质量车道、18 项检查、多平台构建、突变测试 |
| 依赖健康度 | 优秀 | 仅 8 个生产依赖、零已知漏洞 |

---

## 优先级矩阵（推荐执行顺序）

| 优先级 | 改进项 | 工作量 | 影响 | ROI |
|--------|--------|--------|------|-----|
| P0 | Zustand 领域 store（状态管理） | 中 | 高 | 最高 |
| P1 | RSIP 文件分解 | 低-中 | 中 | 高 |
| P1 | Schema fallback 统一 | 低 | 中 | 高 |
| P2 | 声明式 Mapper 工厂（数据层） | 中 | 中高 | 中 |
| P2 | 重新生成 database.types.ts | 低 | 低-中 | 中 |
| P3 | MomentumStorage 接口拆分 | 中 | 中 | 低-中 |

---

## 验证方式

每项改进完成后：
1. `npm run typecheck` — 类型检查通过
2. `npm test` — 烟雾测试通过
3. `npm run quality:ci:required` — 所有必需质量门通过
4. `npm run lint` + `npm run format:check` — 代码风格一致
5. 对于 P0 (Zustand)：验证 AppShellViewProps 的 prop 数量显著减少
6. 对于 P1 (RSIP 分解)：验证 large-file-budget 不再报告这两个文件
