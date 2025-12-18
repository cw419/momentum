# 代码风格与约定

## ESLint 约束（关键）
- `no-console: error`（仅 `src/utils/logger.ts` 例外）
- 未使用变量：允许以下划线 `_` 开头忽略（args/vars/catch）
- 允许空 `catch`（`no-empty` 允许空 catch）

## 推荐的工程约定（来自 `CLAUDE.md`）
- 不要在 `src/` 里直接使用 `process.env.NODE_ENV`：统一用 `src/utils/env.ts`
- 不用 `console.*`：用 `logger`（`src/utils/logger.ts`）
- 弹窗/提示：用 `toast`（`src/utils/toast.ts`），不要 `alert()`
- 组件规模控制：Container/View 拆分，大组件目标 <300 行

## 体系结构约定：三层
1. UI 层：`src/components/`, `src/app/`
   - 纯展示/交互
   - 不直接访问 Supabase 或底层存储
   - 通过 `useStorage()` / domain hooks 间接读写
2. 领域逻辑层：`src/hooks/domains/`
   - `useChainsDomain`, `useSessionsDomain`, `useBettingDomain`, `useRulesDomain`, `useRecycleBinDomain`, `useRsipDomain`, `useGroupDomain`, `useImportExportDomain` 等
3. 基础设施层：`src/storage/`, `src/infra/storage/supabase/`
   - `MomentumStorage` 接口定义存储契约
   - localStorage 与 Supabase 两套实现，通过 `storage.kind` 区分

## 类型系统提示
- 关键类型在 `src/types/index.ts`
- `Chain` 是带判别字段的联合类型（例如 `UnitChain | GroupChain`），修改链相关逻辑时优先用 `type` 分支处理，避免错误地 spread 破坏判别联合。
