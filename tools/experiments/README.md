# tools/experiments

本目录用于放置**一次性/实验性**脚本（诊断、数据修复验证、性能压测等）。

约定：

- 这里的代码**不应**被产品代码（`src/`）import 依赖。
- 允许快速验证想法，但请在稳定后把“最终形态”迁移回 `src/`（并补测试/文档）。
- 若脚本已失效或仅对当时问题有意义：优先删除；否则至少在此 README 里补一行用途说明。

## archive/legacy-artifacts

`tools/experiments/archive/legacy-artifacts/` 存放历史遗留的调试工件（如独立 HTML / bundle / 孤立 JS）。

## archive/legacy-tests

`tools/experiments/archive/legacy-tests/` 存放历史遗留的测试草稿（可能引用过时接口/导入路径，默认不保证可运行）。

## archive/legacy-scripts

`tools/experiments/archive/legacy-scripts/` 存放一次性修复脚本（例如 `directFix.ts`、`quickFix.ts`、`ultimateFix.ts` 等），默认视为历史归档，不参与当前开发流程。

## 当前保留在根目录的脚本

- `schemaCheckerFixed.ts`：架构检查修复实验稿
- `service-optimization.test.ts`：服务优化方向实验测试
- `systemHealthChecker.ts`：系统健康检查实验工具
- `timerPerformanceTest.ts`：计时器性能压测工具
- `UIFixesValidator.ts`：UI 修复验证工具
