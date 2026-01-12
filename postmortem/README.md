# Momentum 项目 Postmortem 报告

本目录包含从 `new-feature-branch` 历史 fix commits 中总结的尸检报告（Postmortem），用于记录和预防类似问题的再次发生。

## 报告分类

| 编号 | 分类 | 文件 | 严重程度 |
|------|------|------|----------|
| PM-001 | 操作顺序依赖 | [PM-001-operation-sequence-bugs.md](./PM-001-operation-sequence-bugs.md) | Critical |
| PM-002 | 事件对象泄漏 | [PM-002-event-object-leakage.md](./PM-002-event-object-leakage.md) | High |
| PM-003 | 状态同步问题 | [PM-003-state-synchronization.md](./PM-003-state-synchronization.md) | High |
| PM-004 | 前后端接口不匹配 | [PM-004-api-contract-mismatch.md](./PM-004-api-contract-mismatch.md) | Medium |
| PM-005 | CSS 过度优化 | [PM-005-css-over-optimization.md](./PM-005-css-over-optimization.md) | Medium |
| PM-006 | 字符编码问题 | [PM-006-encoding-issues.md](./PM-006-encoding-issues.md) | Low |
| PM-007 | 数据库安全策略 | [PM-007-database-security-policy.md](./PM-007-database-security-policy.md) | Medium |
| PM-008 | 任务群执行逻辑 | [PM-008-task-group-execution.md](./PM-008-task-group-execution.md) | High |

## 阅读指南

每份 Postmortem 包含以下章节：

1. **概述** - 问题简要描述
2. **影响范围** - 用户可见症状和影响面
3. **根因分析** - 技术层面的深入分析
4. **修复方案** - 采取的修复措施
5. **预防措施** - 防止类似问题的编码规范和检查清单
6. **相关提交** - 关联的 git commits

## 使用建议

- **代码审查时**：对照 Postmortem 中的"预防措施"检查新代码
- **新功能开发时**：先阅读相关领域的 Postmortem 了解历史坑点
- **Debug 时**：根据症状快速定位可能的根因类别

---

*最后更新：2026-01-12*
