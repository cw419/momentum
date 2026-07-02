\---

Momentum技术债务评估报告（2026-07-02）

\---

1. 屎山指数（综合评分）

先说结论：这是一个"中期成长痛"项目，不是屎山。骨架是健康的，但有几处已经开始化脓的裂缝，不处理会恶化。

┌────────────────┬────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│      维度      │  分数  │                                                              关键证据                                                               │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 文件规模失控   │ 4/10   │ 超300 行源文件约 18 个：RSIPInsightsService.ts648 行、supabase/rsip.ts 599 行、Dashboard.tsx 491 行、sessions/start.ts 403          │
│                │        │ 行、AppShellContainer.tsx 399 行。大多数在 250-400 之间，没有全面失控                                                               │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                │        │ appShellStore 将 AppState（持久化数据）和 NavigationState（UI状态）压在同一个扁平空间，editingChain: Chain | null                   │
│ Store 职责混乱 │ 5/10   │ 这种完整实体快照放在导航状态里是隐患；但 selector 提取器（extractTaskRuntimeState / extractRsipState                                │
│                │        │ 等）已经存在，说明作者意识到了问题                                                                                                  │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Hook 过度膨胀  │ 3/10   │ useChainsDomain.ts 277 行，职责清晰（CRUD + 类型转换），远好于预期；sessions/start.ts 和 sessions/completion.ts 各约 400            │
│                │        │ 行，但已经按操作语义拆分成独立文件                                                                                                  │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 接口粒度太粗   │ 2/10   │ 用户担心的问题已基本解决：MomentumStorage 已经通过 ports.ts 拆成11 个窄接口（ChainStore / SessionStore / RsipStore                  │
│                │        │ 等），StorageCapabilities + hasStorageCapability() 也已就位，不再用 storage.kind 做裸判断                                           │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 类型系统健壮性 │ 6/10   │ as unknown as 达到 94 次，超出CLAUDE.md 设定的硬限制 30 次的3倍；没有 Zod，所有 Supabase 行→域对象的转换、导入 JSON 解析，完全依赖  │
│                │        │ TypeScript 编译期类型                                                                                                               │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 架构层级违规   │ 4/10   │ AppShellContainer.tsx 直接操作 appShellStore.setState() 而不走 actions，形成了 21 处独立 useAppShellStore()                         │
│                │        │ 订阅，等于顶层组件订阅了整个 store 的大量字段；组件目录已有 kebab-case 子目录（chain-editor/ 等）但仍是横向分层而非功能切片         │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 死代码与TODO   │ 3/10   │ Knip + Madge 工具链已就位；目录结构提示测试覆盖良好，tests 目录分布广泛                                                             │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 测试覆盖充分性 │ 2/10   │ 每个核心 domain hook 都有独立测试文件（多个超500 行），Stryker mutation testing 已配置，基础设施完善                                │
├────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 加权总分       │ 3.7/10 │ 架构骨架健康，主要问题是渲染性能、运行时边界防御、以及若干已知但未修复的代码气味                                                    │
└────────────────┴────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

总结：早期到中期屎山的过渡期。项目在6 个月前的建议中，接口拆分、能力协商、store 基础设施这三条已经落地。现在的问题是：局部腐化点在积累，但还没有连片。

\---

2. 高危区（需要立即关注的3 个问题）

高危区 A：21 个独立 store 订阅 + 无 useShallow

位置：AppShellContainer.tsx:46-71

const chains = useAppShellStore((state) => state.chains);
const chainsRevision = useAppShellStore((state) => state.chainsRevision);
const scheduledSessions = useAppShellStore((state) => state.scheduledSessions);
// ... 继续 18 行

21 个独立的 useAppShellStore() 调用，每一个都是独立的 Zustand 订阅。当store 的任意一个字段变化，React 会依次比较这 21 个 selector
的返回值。这里每个字段返回的是数组引用（chains、rsipNodes 等），只要调用了 replaceAppState，所有引用都会变，意味着 AppShellContainer
几乎在每次数据变化时都重新渲染。

为什么危险：这是整个应用的根组件。它重渲染意味着所有传下去的 callback props 也失效，触发子树的级联渲染。这在实际使用中表现为"操作后UI 明显卡顿"。

最小可行修复：用 useShallow 合并相关字段为一个 selector：

import { useShallow } from 'zustand/react/shallow';

const { chains, chainsRevision, scheduledSessions, activeSession, completionHistory } =
useAppShellStore(useShallow((s) => ({
chains: s.chains,
chainsRevision: s.chainsRevision,
scheduledSessions: s.scheduledSessions,
activeSession: s.activeSession,
completionHistory: s.completionHistory,
})));

分3-4 个逻辑分组做就行，不必一次合并全部。

\---

高危区 B：as unknown as 达到 94 次，硬限制 3倍以上

位置：遍布 src/，当前计数94，CLAUDE.md 设定的 CI 硬限制是 30

说明 quality:debt-gate 正在"失守"。这意味着 CI 要么没有严格执行，要么最近有大量绕过。每一个 as unknown as 都是一个类型系统的洞——调用方认为编译器拿到的类型是
X，而实际运行时可能是完全不同的东西。在Supabase 返回数据场景下，这尤其危险：Supabase 的 data 字段是 unknown，强转后若字段结构变了，运行时会悄无声息地错。

为什么危险：没有 Zod 的情况下，as unknown as Domain 是唯一的边界防线，而这个防线等于不存在。

最小可行修复：短期先把 debt-gate 修复到能执行的状态，然后逐步把Supabase mapper 里的强转替换为显式 null 检查。

\---

高危区 C：editingChain: Chain | null 是 store 里的实体快照

位置：appShellStore.ts:19、NavigationState 接口

用户进入编辑器时，editingChain 保存的是整个 Chain 对象快照。如果期间另一个操作（比如实时同步）更新了这条chain的数据，editingChain 和store 里chains\[]
里的版本会出现漂移：用户保存时用的是旧快照数据覆写了新数据，导致静默丢失变更。

为什么危险：这在多标签页、云同步开启、或长时间挂在编辑器页面时必然触发。

最小可行修复：将 editingChain: Chain | null 改为 editingChainId: string | null，在编辑器组件里通过 id 从 chains\[] 实时derive当前对象。

\---

3. 六大建议的优先级矩阵

基于实际代码状态（不是假设），重新评估这六个方向：

┌──────────────────────────────────┬──────────────────────────────────────────────────┬──────────────────────┬────────────────────┬───────────────────────┐
│               建议               │                    当前严重度                    │       实施难度       │        ROI         │       推荐时序        │
├──────────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────┼────────────────────┼───────────────────────┤
│ ① 功能切片目录                   │ 低（目录已有子结构）                             │ 高（需要大量移文件） │ 低短期 / 高长期    │ 第4 周后，等其他稳定  │
├──────────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────┼────────────────────┼───────────────────────┤
│ ② Zustand 边界拆分               │ 中（editingChain + 21 selector）                 │ 低                   │ 高                 │ 第 1 周               │
├──────────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────┼────────────────────┼───────────────────────┤
│ ③ UseCase / Repository层         │ 低（useChainsDomain 已经很干净）                 │ 高                   │ 中                 │ 第 6 周后，视扩张速度 │
├──────────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────┼────────────────────┼───────────────────────┤
│ ④ Zod 运行时验证                 │ 高（94 个 as unknown as，无运行时防线）          │ 中                   │ 极高               │ 第 1-2 周             │
├──────────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────┼────────────────────┼───────────────────────┤
│ ⑤ 架构门禁（dependency-cruiser） │ 中（无自动检查）                                 │ 低                   │ 高（防止未来违规） │ 第 2-3 周             │
├──────────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────┼────────────────────┼───────────────────────┤
│ ⑥ 契约测试 +浏览器测试           │ 中（localStorageAdapter vs Supabase 无共享契约） │ 中                   │ 高                 │ 第 3-4 周             │
└──────────────────────────────────┴──────────────────────────────────────────────────┴──────────────────────┴────────────────────┴───────────────────────┘

说明：

* 建议 ③ 的担忧（useChainsDomain 过于臃肿）在现有代码中已部分缓解，目前它只有 277 行且职责清晰。sessions/start.ts 和 sessions/completion.ts 各约 400
行是更大的关注点。
* 建议 ① 需要基础设施稳固后再动，否则移文件同时引入新 bug。

\---

4. 立即可做的 Quick Win

QW1：用 useShallow 合并 AppShellContainer 的 store 订阅（半天）
文件：AppShellContainer.tsx:46-71。把 21 个独立 selector 合并为 3-4 个 useShallow 分组。预期收益：根组件渲染次数显著下降。

QW2：editingChain → editingChainId（1 天）
文件：appShellStore.ts:19，以及所有使用 selectEditingChain 的组件。把实体快照改为 ID 引用，在编辑器里用 chains.find(c => c.id === editingChainId)
实时派生。消除编辑场景下的"幽灵数据"风险。

QW3：修复 debt-gate 让 as unknown as 门禁重新生效（半天）
运行 npm run quality:debt-gate 查看当前报告，理解为何 94 个能通过。如果是预算配置松了，收紧；如果是工具本身没跑，修复 CI 配置。

QW4：给Supabase mapper 加第一个 Zod schema（1-2 天）
从 src/infra/storage/supabase/chains/ 开始，给 chains 行定义一个最简单的 Zod schema，用 z.safeParse() 在mapper 入口做校验。验证这个模式可行后，其他 mapper
可以渐进补入。

QW5：加dependency-cruiser 配置文件（半天）
npx dependency-cruiser --init
加入三条规则：domain/ 不能import components/ 或 app/；storage/ 不能 import hooks/domains/；components/ 不能直接 import infra/storage/supabase/。接入CI。

\---

5. 功能切片目录迁移草案

基于实际代码分析，推荐的顶级features 及迁移顺序（从最独立开始）：

src/features/
├── pet/              ← 最独立，依赖最少（usePetDomain 几乎无外部耦合）
│   ├── ui/           # components/pet/
│   ├── domain/       # domain/pet.ts
│   └── store/        # 从 appShellStore 剥离 pet 状态（目前没有，因为 pet 不在 AppState 里）
│
├── rules/            ← 第二独立（ExceptionRule 系统自成体系）
│   ├── ui/           # components/rule-manager/ + RuleSelectionDialog.tsx
│   ├── domain/       # 从 domain/ 中抽取规则相关
│   ├── application/  # useRulesDomain + ExceptionRuleManager
│   └── infra/        # ExceptionRuleStorage / ExceptionRuleCache
│
├── rsip/             ← 第三独立（RSIP 有独立的 store 字段组）
│   ├── ui/           # components/rsip/
│   ├── domain/       # RSIP 相关纯逻辑
│   ├── application/  # useRsipDomain（346 行，是迁移重点）
│   └── infra/        # infra/storage/supabase/rsip.ts →留原路径或迁移
│
├── chains/           ← 核心，依赖最多，最后迁移
│   ├── ui/           # chain-card/ chain-editor/ chain-detail/ group-view/ group-card/
│   ├── domain/       # scheduling.ts + chain相关
│   ├── application/  # useChainsDomain + useGroupDomain + useRecycleBinDomain
│   └── store/        # chains/sessions部分从 appShellStore 剥离
│
│   └── store/        # chains/sessions部分从 appShellStore 剥离
│
├── sessions/         ← 与 chains 耦合，一起迁移
│   ├── ui/           # focus-mode/ + AuxiliaryJudgment.tsx
│   ├── domain/       # sessions/ 子目录
│   └── application/  # useSessionsDomain + useBettingDomain
│
└── account/          ← 相对独立（auth + settings）
├── ui/           # account-modal/ + AuthForm.tsx
├── domain/       # domain/auth.ts + userSettings.ts
└── application/  # useImportExportDomain（也属于这层）

src/app/ 只保留 AppShellContainer.tsx、AppShellView.tsx、app-shell/（视图模型构建器），作为纯粹的 composition root。

迁移顺序建议：

1. pet → 2. rules → 3. account → 4. rsip → 5. sessions + chains（一起，因为耦合深）

每一步都应该先建好目标目录和桶文件（index.ts），更新 imports，跑全量测试通过后再提PR。不要一次迁移多个 feature。

\---

一句话总结：这个项目的架构设计是认真的，骨架比外观看起来健康很多——接口已经拆了，能力协商已经有了，测试体系是齐的。现在最紧急的不是重新设计，而是修复两个正在出血的
伤口：as unknown as 泛滥和 AppShellContainer 的渲染性能；然后在边界加上 Zod 和 dependency-cruiser
这两扇门。功能切片目录迁移是正确方向，但在上面两件事稳定之前，不要急着动。

✻ Waiting for 1 dynamic workflow to finish

● Dynamic workflow "对 momentum 项目做全面屎山评估：目录结构、核心模块复杂度、静态分析、架构层级违规、综合打分与重构路线图" completed · 7m 46s

Thought for 16s, read 1 file (ctrl+o to expand)



Madge 循环依赖检查结果（来自 workflow agent）：

No circular dependency found!
扫描 607 个文件（.ts/.tsx），耗时 5.4s

四类架构跨层 import 均为0：

* domain/ import @/hooks：0 处
* domain/ import @/stores：0 处
* storage/ import @/components：0 处
* domain/ import @/components：0 处

这个结果让架构层级违规维度从我之前估的 4/10 降到 2/10——三层分层约束在代码库层面是真实有效的，不只是文档上说说而已。这是项目架构质量最积极的信号之一。

结合之前的完整分析，加权总分相应修正为约 3.2/10（屎山指数更低）。

现有评估和建议优先级保持不变：第一周修useShallow（21个store 订阅）和 editingChain → editingChainId，第一二周补Zod 边界，第二三周加 dependency-cruiser

