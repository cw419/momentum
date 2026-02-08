# RSIP 国策树功能改进建议

## Context

基于更新版文章（尤其是新增的第 23-24 节"RSIP 实战攻略"），对比现有代码库中 RSIP 的实现，提出以下聚焦于国策树的 feature 建议。

更新版文章相比旧版的核心新增内容集中在：
- 第 23 节：RSIP 十步推理链路总结
- 第 24 节：四大实战攻略（零敲牛皮糖、农村包围城市、国策组容错、崩塌与重建）

---

## 现有实现概况

- **类型**: `RSIPNode`（含 stabilityPhase E0/E1/E2、执行追踪字段）、`RSIPMeta`、`RSIPTreeNode`
- **域逻辑**: `useRsipDomain` — 执行/违反标记、阶段升级、约束力计算、堆栈删除
- **UI**: RSIPCanvas（可视化树）、RSIPForm、RSIPStrictModeCard、RSIPViolationDialog 等
- **存储**: localStorage + Supabase 双实现

---

## 建议一：国策组（Policy Group）+ 容错名额

**文章依据**: 攻略三 — "把鸡蛋放在许多篮子里"

**现状**: 当前节点只有 parent-child 关系，没有"组"的概念。一个节点违反就级联删除所有子节点，容错率为零。

**建议**:
- 新增 `RSIPNodeGroup` 概念：允许将若干相关国策打包为一个"国策组"
- 国策组有 `faultTolerance: number` 字段（容错名额），例如 5 个国策的组允许 1 个熄灭
- 只要组内点亮数 >= (总数 - faultTolerance)，组整体仍视为"点亮"，不触发子节点级联删除
- UI 上用虚线框或背景色区分国策组

**关键文件**:
- `src/types/rsip.ts` — 新增 group 相关字段
- `src/hooks/domains/useRsipDomain.ts` — 修改 `markViolated` 逻辑
- `src/components/rsip/` — 组的可视化

---

## 建议二：可强化升级国策（Reinforcement Levels）

**文章依据**: 第 22 节 — "作息储备计划"可强化+1、+2、+3

**现状**: 节点只有 E0/E1/E2 三个稳定性阶段，没有"强化等级"概念。

**建议**:
- 为 `RSIPNode` 新增 `reinforcementLevel?: number`（强化等级，默认 0）
- 强化等级作为"冗余储备"：违反时先扣强化等级而非直接删除节点
- 例如 +3 的国策违反一次变为 +2，不触发级联删除；降到 0 后再违反才真正删除
- UI 上用徽章/星星显示强化等级

**关键文件**:
- `src/types/rsip.ts` — 新增 reinforcementLevel 字段
- `src/hooks/domains/useRsipDomain.ts` — 修改 markViolated 和 markExecuted
- `src/components/rsip/RSIPStrictModeCard.tsx` — 显示强化等级

---

## 建议三：内化进度条 + 国策库（Roguelike 机制）

**文章依据**: 攻略四 — "习惯的内化进度条不会丢失"、Roguelike 比喻

**现状**: 节点违反后直接删除，所有历史数据丢失。没有"国策库"概念。

**建议**:
- 新增 `RSIPPolicyLibrary`（国策库/手牌）：被删除的国策不彻底消失，而是回到国策库
- 每个国策保留 `internalizationProgress: number`（内化进度，0-100%），基于历史累计执行天数计算
- 从国策库重新添加国策时，继承之前的内化进度，降低重新建立的难度
- 新增"轮次"(run) 概念：每次国策树大规模崩塌算一轮，记录每轮的最大深度和持续天数
- UI 上新增"国策库"面板，展示可重新启用的历史国策及其内化进度

**关键文件**:
- `src/types/rsip.ts` — 新增 PolicyLibrary、internalizationProgress 等类型
- `src/hooks/domains/useRsipDomain.ts` — markViolated 时移入国策库而非删除
- 新增 UI 组件：国策库面板

---

## 建议四：国策拆分工作流（零敲牛皮糖）

**文章依据**: 攻略一 — 将"早睡早起"拆分为 5 个小国策

**现状**: 用户只能手动一个个创建节点，没有"从大目标拆分"的引导流程。

**建议**:
- 在 RSIPForm 中新增"拆分模式"：输入一个大目标（如"早睡早起"），引导用户拆分为多个小国策
- 拆分后的小国策自动建立 parent-child 关系或组成国策组
- 提供"拆分建议"模板：针对常见目标（作息、运动、饮食等）预设拆分方案
- 标记哪些国策是"被动国策"（如自动化规则，维护成本≈0）

**关键文件**:
- `src/components/rsip/RSIPForm.tsx` — 新增拆分模式 UI
- `src/types/rsip.ts` — 新增 `isPassive?: boolean` 字段

---

## 建议五：崩塌历史与轮次统计（Run History）

**文章依据**: 攻略四 — Roguelike 机制、"失败-强化-再挑战"

**现状**: 没有记录国策树的崩塌历史，用户无法回顾过去的"轮次"。

**建议**:
- 新增 `RSIPRunHistory` 类型：记录每次"轮次"的起止时间、最大节点数、崩塌原因
- 在 RSIPMeta 中新增 `currentRun: number`、`runHistory: RSIPRunRecord[]`
- UI 上新增"历史轮次"面板，展示每轮的统计数据和成长曲线
- 可视化"每轮比上轮走得更远"的进步趋势

**关键文件**:
- `src/types/rsip.ts` — 新增 RunHistory 类型
- `src/hooks/domains/useRsipDomain.ts` — 崩塌时记录轮次
- 新增 UI 组件：轮次历史面板

---

## 实施顺序

P0 → P1 → P2，共 5 个 feature，按以下顺序实施：
1. 类型层变更（一次性完成所有 5 个 feature 的类型定义）
2. 域逻辑层变更（useRsipDomain）
3. 存储层变更（MomentumStorage 接口 + 两个实现）
4. UI 层变更（逐个 feature 的组件）
5. 测试

---

## Step 1: 类型层变更 — `src/types/rsip.ts`

### 1.1 RSIPNode 新增字段

```typescript
export interface RSIPNode {
  // ... 现有字段保持不变 ...

  // 【Feature 1: 国策组】
  groupId?: string;           // 所属国策组 ID（为空则不属于任何组）

  // 【Feature 2: 强化升级】
  reinforcementLevel?: number; // 强化等级（默认 0），违反时先扣等级
  maxReinforcementLevel?: number; // 历史最高强化等级

  // 【Feature 3: 内化进度】
  cumulativeExecutionDays?: number; // 历史累计执行天数（跨轮次保留）

  // 【Feature 4: 拆分工作流】
  isPassive?: boolean;         // 是否为被动国策（自动化规则，维护成本≈0）
  splitFromGoal?: string;      // 拆分来源的大目标描述
}
```

### 1.2 新增：国策组类型

```typescript
export interface RSIPNodeGroup {
  id: string;
  title: string;              // 组名（如"作息国策组"）
  faultTolerance: number;     // 容错名额（允许几个国策熄灭）
  createdAt: Date;
  emoji?: string;
}
```

### 1.3 新增：国策库条目类型

```typescript
export interface RSIPLibraryEntry {
  id: string;                  // 与原 RSIPNode.id 相同
  title: string;
  rule: string;
  type?: string;
  emoji?: string;
  cumulativeExecutionDays: number; // 累计执行天数
  internalizationProgress: number; // 内化进度 0-100
  lastActiveAt: Date;          // 最后一次在树中活跃的时间
  timesUsed: number;           // 被添加到树中的次数
  useTimer?: boolean;
  timerMinutes?: number;
  isPassive?: boolean;
}
```

### 1.4 新增：轮次记录类型

```typescript
export interface RSIPRunRecord {
  runNumber: number;
  startedAt: Date;
  endedAt?: Date;              // 崩塌时间（当前轮次为 undefined）
  maxNodeCount: number;        // 该轮最大节点数
  durationDays: number;        // 持续天数
  collapseReason?: string;     // 崩塌原因（用户可选填）
  collapseNodeTitle?: string;  // 导致崩塌的节点名称
}
```

### 1.5 RSIPMeta 新增字段

```typescript
export interface RSIPMeta {
  // ... 现有字段保持不变 ...

  // 【Feature 3: 国策库】
  policyLibrary?: RSIPLibraryEntry[];

  // 【Feature 5: 轮次统计】
  currentRunNumber?: number;
  currentRunStartedAt?: Date;
  runHistory?: RSIPRunRecord[];
}
```

### 1.6 AppState 新增字段

```typescript
// 在 AppState 中新增：
rsipGroups?: RSIPNodeGroup[];
```

---

## Step 2: 域逻辑层变更 — `src/hooks/domains/useRsipDomain.ts`

### 2.1 修改 `markViolated` — 支持强化等级 + 国策组容错

现有逻辑：违反 → 删除节点及所有子孙。

新逻辑：
1. 检查节点是否有 `reinforcementLevel > 0`
   - 是 → 扣一级强化，不删除，不级联
2. 否则，检查节点是否属于某个国策组（`groupId`）
   - 是 → 检查组内已熄灭数是否 < `faultTolerance`
     - 未超限 → 仅标记该节点为"熄灭"（从 nodes 中移除），组整体仍存活，不级联删除组的子节点
     - 已超限 → 组整体崩塌，级联删除组内所有节点及组的子节点
3. 都不满足 → 走原有逻辑：删除节点 + 所有子孙

### 2.2 修改 `markExecuted` — 支持强化升级

现有逻辑：递增 consecutiveExecutions，阶段升级。

新增逻辑：
- 同时递增 `cumulativeExecutionDays`（跨轮次累计）
- 当节点已达 E2 且继续执行时，可选择"强化升级"（`reinforcementLevel += 1`）
- 更新 `maxReinforcementLevel` 如果新等级超过历史最高

### 2.3 新增方法：国策库管理

```
archiveToLibrary(node: RSIPNode, meta: RSIPMeta) → RSIPMeta
```
- 违反删除时调用，将节点信息写入 `meta.policyLibrary`
- 如果库中已有同 id 条目，合并 `cumulativeExecutionDays`
- 计算 `internalizationProgress`：`min(100, cumulativeExecutionDays * 100 / 60)`（60天完全内化）
- 递增 `timesUsed`

```
restoreFromLibrary(entryId: string, parentId: string | undefined, meta: RSIPMeta) → { node: RSIPNode, meta: RSIPMeta }
```
- 从国策库恢复国策到树中，继承 `cumulativeExecutionDays`
- 不从库中删除条目（保留历史记录），但更新 `lastActiveAt`

### 2.4 新增方法：轮次管理

```
recordCollapse(meta: RSIPMeta, reason?: string, nodeTitle?: string) → RSIPMeta
```
- 当根节点崩塌或用户手动重置时调用
- 将当前轮次写入 `runHistory`
- 递增 `currentRunNumber`，重置 `currentRunStartedAt`

```
startNewRun(meta: RSIPMeta) → RSIPMeta
```
- 首次添加节点时，如果 `currentRunNumber` 为空则初始化为 1

### 2.5 新增方法：国策组 CRUD

```
saveGroups(groups: RSIPNodeGroup[]) → void
```
- 保存国策组到 storage

```
createGroup(title: string, faultTolerance: number, emoji?: string) → RSIPNodeGroup
```

```
isGroupAlive(groupId: string, nodes: RSIPNode[], groups: RSIPNodeGroup[]) → boolean
```
- 计算组内存活节点数，与 faultTolerance 比较

### 2.6 修改 `calculateConstraintPower` — 考虑强化等级

现有公式：`failureCost = (descendantCount + 1) × phaseWeight`

新公式：`failureCost = (descendantCount + 1) × phaseWeight × (reinforcementLevel > 0 ? 0.3 : 1)`
- 有强化等级的节点，违反代价显示为"仅扣一级"，实际 failureCost 降低

---

## Step 3: 存储层变更

### 3.1 MomentumStorage 接口 — `src/storage/MomentumStorage.ts`

新增方法：
```
getRSIPGroups(): Promise<RSIPNodeGroup[]>;
saveRSIPGroups(groups: RSIPNodeGroup[]): Promise<void>;
```

现有 `saveRSIPNodes` / `saveRSIPMeta` 无需改签名，新字段通过现有方法透传。

### 3.2 localStorage 适配器 — `src/utils/storage/`

- `saveRSIPGroups` / `getRSIPGroups`：新增 localStorage key `momentum_rsip_groups`
- RSIPNode 新字段（groupId, reinforcementLevel 等）随现有 `saveRSIPNodes` 自动持久化
- RSIPMeta 新字段（policyLibrary, runHistory 等）随现有 `saveRSIPMeta` 自动持久化

### 3.3 Supabase 适配器 — `src/infra/storage/supabase/rsip.ts`

- 新增 `rsip_groups` 表（或在现有表中加列，取决于 schema 策略）
- `rsipPayloadBuilder.ts` 中新增 group 相关 payload 构建
- RSIPNode 新字段需要 Supabase migration 添加列
- 沿用现有的 graceful fallback 模式：缺列时降级到基础 payload

---

## Step 4: UI 层变更

### 4.1 Feature 1 — 国策组 UI

**修改 `src/components/rsip/RSIPForm.tsx`**:
- 新增"创建国策组"按钮，弹出表单：组名、容错名额、emoji
- 节点创建时新增"所属国策组"下拉选择（可选）

**修改 `src/components/rsip/RSIPNodeCard.tsx`**:
- 属于同一组的节点显示组标识（小徽章）
- 组内节点用相同背景色/边框色区分

**修改 `src/components/rsip/RSIPCanvasView.tsx`**:
- 同组节点用虚线框包围，显示组名和容错状态（如"3/5 存活，容错 1"）

**修改 `src/components/rsip/RSIPViolationDialog.tsx`**:
- 如果节点属于组且组仍有容错余量，提示"该节点将熄灭，但国策组仍存活"
- 如果组容错已耗尽，提示"国策组将整体崩塌"

### 4.2 Feature 2 — 强化升级 UI

**修改 `src/components/rsip/RSIPStrictModeCard.tsx`**:
- 在 RSIPPhaseBadge 旁显示强化等级徽章（如 ⭐×3）
- E2 阶段的"已执行"按钮旁新增"强化升级"选项
- 违反按钮的确认文案根据强化等级变化：有强化时显示"扣除一级强化（当前 +3 → +2）"

**修改 `src/components/rsip/RSIPNodeCard.tsx`**:
- 有强化等级的节点显示星星数量
- 强化等级越高，节点边框/光晕越明显（视觉反馈）

**修改 `src/components/rsip/RSIPConstraintIndicator.tsx`**（如存在）:
- 显示"有强化护盾"提示，区分"真正删除"和"扣强化"的代价

### 4.3 Feature 3 — 国策库 + 内化进度 UI

**新增 `src/components/rsip/RSIPPolicyLibrary.tsx`**:
- 独立面板，通过 RSIPView 中的 Tab 切换访问（"国策树" / "国策库"）
- 列表展示所有历史国策条目：
  - emoji + 标题 + 规则摘要
  - 内化进度条（0-100%，颜色渐变：红→黄→绿）
  - 累计执行天数、使用次数
  - "重新启用"按钮 → 将国策添加回树中（弹出父节点选择）
- 支持按内化进度排序、按类型筛选

**修改 `src/components/RSIPView.tsx`**:
- 顶部新增 Tab 栏："国策树" | "国策库" | "轮次历史"
- 根据 Tab 切换显示不同面板

**修改 `src/components/rsip/RSIPViolationDialog.tsx`**:
- 删除确认中新增提示："该国策将移入国策库，内化进度保留"

### 4.4 Feature 4 — 国策拆分工作流 UI

**修改 `src/components/rsip/RSIPForm.tsx`**:
- 新增"拆分模式"切换按钮（普通添加 / 拆分添加）
- 拆分模式下：
  - 输入大目标描述（如"早睡早起"）
  - 动态添加多个子国策行（标题 + 规则 + 被动标记）
  - 每行可标记为"被动国策"（isPassive）
  - 提交时批量创建节点，自动组成国策组或 parent-child 关系
- 预设模板按钮：点击后自动填充常见拆分方案（作息、运动、饮食）

### 4.5 Feature 5 — 轮次历史 UI

**新增 `src/components/rsip/RSIPRunHistory.tsx`**:
- 通过 RSIPView Tab 栏访问
- 时间线视图展示每轮记录：
  - 轮次编号、起止日期、持续天数
  - 最大节点数（柱状图或数字）
  - 崩塌原因（如有）
- 底部统计：总轮次数、最长持续天数、平均节点数
- 趋势指标：最近 N 轮的"最大节点数"是否呈上升趋势

---

## Step 5: 测试

### 5.1 域逻辑测试 — `src/hooks/domains/__tests__/useRsipDomain.test.ts`

扩展现有测试文件，新增用例：
- `markViolated` 有强化等级时：扣一级而非删除
- `markViolated` 国策组容错：组内未超限时不级联
- `markViolated` 国策组容错耗尽：整组崩塌
- `markExecuted` E2 后强化升级
- `archiveToLibrary`：正确计算内化进度
- `restoreFromLibrary`：继承累计执行天数
- `recordCollapse`：正确记录轮次
- `isGroupAlive`：各种边界情况

### 5.2 工具函数测试 — `src/utils/__tests__/rsipTree.test.ts`

扩展现有测试，覆盖国策组相关的树操作。

### 5.3 组件测试

- RSIPPolicyLibrary 组件渲染和交互
- RSIPRunHistory 组件渲染
- RSIPForm 拆分模式
- RSIPViolationDialog 强化等级/国策组场景

---

## Step 6: 验证方案

### 6.1 类型安全验证
```bash
npm run typecheck
```
确保所有新增类型字段向后兼容（全部为 optional），不破坏现有代码。

### 6.2 单元测试验证
```bash
npm run test:all
```
确保现有测试不被破坏，新增测试全部通过。

### 6.3 功能验证清单

**Feature 1 — 国策组**:
- [ ] 创建国策组（设置名称、容错名额）
- [ ] 将节点分配到组中
- [ ] 违反组内节点时，组仍存活（容错未耗尽）
- [ ] 容错耗尽后，组整体崩塌并级联删除

**Feature 2 — 强化升级**:
- [ ] E2 阶段节点可强化升级（+1, +2, +3...）
- [ ] 违反有强化的节点时，仅扣一级而非删除
- [ ] 强化降到 0 后再违反，走正常删除逻辑

**Feature 3 — 国策库 + 内化进度**:
- [ ] 节点被删除时自动归档到国策库
- [ ] 国策库显示内化进度条（基于累计执行天数）
- [ ] 从国策库恢复国策到树中，继承历史进度

**Feature 4 — 拆分工作流**:
- [ ] 拆分模式下输入大目标，批量创建子国策
- [ ] 子国策自动建立 parent-child 或组关系
- [ ] 被动国策标记正确显示

**Feature 5 — 轮次历史**:
- [ ] 根节点崩塌时记录轮次
- [ ] 轮次历史面板展示每轮统计
- [ ] 新轮次正确初始化

### 6.4 存储兼容性验证
- [ ] localStorage：新字段正确持久化和读取，旧数据无字段时不报错
- [ ] Supabase：graceful fallback 模式下缺列不崩溃

### 6.5 构建验证
```bash
npm run build
npm run lint
```
确保生产构建和 lint 均通过。
