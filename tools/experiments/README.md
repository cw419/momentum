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
