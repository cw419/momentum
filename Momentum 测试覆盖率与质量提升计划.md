Momentum 测试覆盖率与质量提升计划（ROI 快达标版，已 Fact-check）
Summary
目标：在保证质量门禁的前提下，把 CI 覆盖率从当前基线提升到最终 80/72/80/80（Stmts/Branch/Funcs/Lines），并提升 test 质量与 mutation 有效性。
当前已核实基线（本地实跑）：
npm run test:coverage：130 files / 1187 tests 全绿；覆盖率 74.42 / 65.15 / 73.61 / 75.13
距离最终目标仍需约：+549 statements、+373 branches、+161 functions（按当前统计口径）
npm run typecheck、npm run lint、npm run quality:knip、npm run quality:depcheck 通过
npm run quality:smell-audit 发现 1 条 Sonar 问题：AsyncOperationManager.ts (line 79)
MCP 事实核验：
mutation.html（DevTools MCP）显示 mutation score 81.24（of total），84.38（of covered），当前 break=80 可过。
MCP resources/template 列表为空，后续以仓库本地数据为主。
Fact-check 修正点（针对现有 claude test plan.md）
claude test plan.md (line 185)、claude test plan.md (line 188)、claude test plan.md (line 189) 的 AccountModal 文件路径已过时：
ModalContent.tsx、ManageSection.tsx 不存在
应改为以 AccountModal.tsx (line 1)、AccountModalUserContent.tsx (line 1)、AccountModalLanguageSection.tsx (line 1) 为主。
claude test plan.md (line 23) / claude test plan.md (line 28) 的 ErrorPatterns 测试优先级应下调：ErrorPatterns.ts 当前已接近/达到满覆盖，不是 ROI 主战场。
高 ROI 分支缺口应补充：useChainEditorForm.ts (line 1)、AccountModal.tsx (line 1)（你已选择纳入主线）。
Scope（按你选择：ROI 快达标 + 单人串行/小并行）
主线优先（P0）
useRuleManagerActions.ts (line 1)
useChainCard.ts (line 1)
useChainEditorForm.ts (line 1)
AccountModal.tsx (line 1)
次主线（P1）
ErrorClassificationService.ts (line 1)
ErrorClassifiers.ts (line 1)
EnhancedRuleValidationService.ts (line 1)
typeMatch.ts (line 1)
RecoveryHandlers.ts (line 1)
DefaultStrategies.ts (line 1)
RuleCreator.ts (line 1)
补齐层（P2）
PerformanceMonitor.ts (line 1)
observers.ts (line 1)
reporting.ts (line 1)
ChainCardView.tsx (line 1)
RuleManagerFormModal.tsx (line 1)
AccountModalUserContent.tsx (line 1)
Implementation Phases
Phase 0 — 基线与门禁固化（不改业务逻辑）
建立覆盖率与质量看板基线（coverage + mutation + smell-audit）。
记录并纳入计划的 Sonar 阻断项：AsyncOperationManager.ts (line 79)。
验收命令：
npm run typecheck
npm run lint
npm run quality:smell-audit
npm run test:coverage
Phase 1 — Branch 快速回收（主线 P0）
新增测试文件（建议）：
useRuleManagerActions.test.ts (line 1)
useChainCard.test.ts (line 1)
useChainEditorForm.test.ts (line 1)
AccountModal.behavior.test.tsx (line 1)
核心场景：
useRuleManagerActions：create/update 成功、warning、ExceptionRuleException、unknown error、回滚、duplicate suggestions、export 失败。
useChainCard：定时器倒计时、阈值通知、到时音效只触发一次、删除确认焦点/ESC、无时长 lastCompletion 分支。
useChainEditorForm：custom trigger、durationless、minimumDuration、circular parent 防护、提交字段裁剪和 fallback。
AccountModal：local/supabase 双路径、loading/error/user/empty 渲染分支、toggle gambling 成功/失败、signOut 成功/失败。
阶段目标：优先补 Branch 缺口，预期把 Branch 拉升到 ~68% 附近。
Phase 2 — 服务层稳定性与错误路径（次主线 P1）
新增测试文件（建议）：
ErrorClassificationService.test.ts (line 1)
ErrorClassifiers.test.ts (line 1)
EnhancedRuleValidationService.test.ts (line 1)
typeMatch.test.ts (line 1)
RecoveryHandlers.test.ts (line 1)
DefaultStrategies.test.ts (line 1)
RuleCreator.test.ts (line 1)
核心场景：
错误分类：known/default 分类、confidence、recommendations 去重、history 截断与统计。
预校验：rule missing/inactive/storage error/cache hit/type mismatch。
恢复链路：auto-fix 成功与失败 fallback、用户动作要求、generic recovery。
RuleCreator：validate->dedupe->create、链专属创建、real-time check、recovery 成功回填与失败抛错。
阶段目标：到达并稳定阶段阈值 78/68/76/78（第一步爬坡）。
Phase 3 — 补齐层 + 组件质量
新增测试文件（建议）：
PerformanceMonitor.test.ts (line 1)
observers.test.ts (line 1)
reporting.test.ts (line 1)
ChainCardView.test.tsx (line 1)
RuleManagerFormModal.test.tsx (line 1)
AccountModalUserContent.test.tsx (line 1)
核心场景：
observers：无 window、无 PerformanceObserver、创建异常降级。
PerformanceMonitor：start/stop 幂等、batch interval、measure 委托、observer disconnect。
UI 组件：defined/undefined callback、条件渲染、loading state、禁用态、错误 dismiss。
阶段目标：冲刺最终 80/72/80/80。
Phase 4 — 质量门禁与 Mutation（核心 4 模块）
先处理 Sonar 阻断项（AsyncOperationManager.ts (line 79)）。
Mutation 扩展（你选择“核心4模块先行”）在 stryker.config.mjs (line 6) 的 mutate 中新增：
ErrorClassifiers.ts
typeMatch.ts
RecoveryStrategy.ts
timerState.ts
验收：
npm run test:mutation
目标：总分不低于当前基线并维持 break >= 80。
CI 阈值爬坡策略（你已确认“两步”）
第一步：修改 vitest.ci.config.ts (line 31) 到 78/68/76/78，连续 2 次全绿后再升。
第二步：再升到最终 80/72/80/80，并保持至少 3 次连续全绿（含一次完整 quality/mutation）。
Public APIs / Interfaces / Types 影响
业务 API/类型：不计划新增或变更公开运行时接口。
工程接口变更：
CI 覆盖率门槛（vitest.ci.config.ts (line 31)）
mutation 目标范围（stryker.config.mjs (line 6)）
质量门禁新增 Sonar 清零要求（基于 quality:smell-audit）
Test Cases & Scenarios（统一质量标准）
每个 catch 路径必须有对应测试。
每个 switch default、可选链回调 ?.、短路表达式都要覆盖 true/false 双分支。
禁止弱断言（如仅 toBeTruthy）；要求断言具体值、调用次数、参数。
hook 测试统一使用 fake timers + act；异步状态迁移必须验证 before/after。
组件测试区分容器传参与视图行为，避免把实现细节耦合进测试。
Assumptions & Defaults（已锁定）
策略：ROI 快速达标。
范围：纳入 useChainEditorForm 与 AccountModal 主线。
门禁：quality:smell-audit 纳入必过。
阈值：两步爬坡（先 78/68/76/78，再 80/72/80/80）。
Mutation：先核心 4 模块，确保 break 不退化。
执行方式：单人串行 + 小并行批次（每阶段结束统一跑全量验收命令）。