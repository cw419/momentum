# Momentum 文档索引

本目录存放 Momentum 的开发者文档（架构、领域说明、部署与排错等）。

## 功能概览

- **功能总览**：`docs/FEATURES_OVERVIEW.md` - 所有功能模块的完整说明
- **人工测试指南**：`docs/guides/TESTING_GUIDE.md` - 测试人员检查清单

## 快速入口

- 架构总览：`docs/guides/ARCHITECTURE.md`
- 数据库 Schema：`docs/api/DATABASE_SCHEMA.md`
- 部署：`docs/guides/DEPLOYMENT.md`
- 调试：`docs/guides/DEBUGGING_GUIDE.md`
- 性能基准：`docs/guides/PERFORMANCE_BENCHMARKS.md`

## 指南

- 入门：`docs/guides/for-beginners.md`
- 链编辑器：`docs/guides/CHAIN_EDITOR_GUIDE.md`
- 手动迁移：`docs/guides/apply-migration.md`
- 性能基准与优化：`docs/guides/PERFORMANCE_BENCHMARKS.md`
- 自控力背景阅读（EN）：`docs/guides/How to Improve Self-Control by edmond EN.md`
- 自控力背景阅读（中文）：`docs/guides/如何提高自制力？-edmond的回答.md`

## 领域文档

- `docs/features/DOMAIN_CHAINS.md`
- `docs/features/DOMAIN_SESSIONS.md`
- `docs/features/DOMAIN_RULES.md`
- `docs/features/DOMAIN_RSIP.md`
- `docs/features/DOMAIN_BETTING.md`
- `docs/features/DOMAIN_IMPORT_EXPORT.md`
- `docs/features/DOMAIN_RECYCLE_BIN.md`
- `docs/features/DOMAIN_GROUPS.md`

## 功能文档

- 每日打卡：`docs/features/DAILY_CHECKIN_SUMMARY.md`
- 今日计划：`docs/features/DAILY_PLANS.md`
- 宠物系统：`docs/features/PET_FEATURE.md`
- 计时器：`docs/features/TIMER_FEATURE_SUMMARY.md`
- 分组视图增强：`docs/features/GROUP_VIEW_ENHANCEMENTS.md`
- 声音系统：`docs/features/SOUND_FEATURE.md`
- 回收箱（中文）：`docs/features/README-回收箱功能.md`
- 时间限定功能（中文）：`docs/features/时间限定功能说明.md`
- RSIP 任务联动：`docs/features/RSIP_TASK_INTEGRATION.md`
- RSIP 分析与推荐：`docs/features/RSIP_INSIGHTS.md`
- RSIP 国策库：`docs/features/RSIP_POLICY_LIBRARY.md`
- RSIP 轮次历史：`docs/features/RSIP_RUN_HISTORY.md`

## API

- 每日打卡 API：`docs/api/daily-checkin-api-guide.md`

## 模块文档

- `docs/modules/EXCEPTION_RULE_SYSTEM.md` - 例外规则系统设计
- `docs/modules/RSIP_PROTOCOL.md` - RSIP 协议概述
- `docs/modules/CHAIN_TYPES.md` - 链条类型说明

## 历史记录

- `docs/history/FIXES_SUMMARY.md`
- `docs/history/TOUCH_FIX_SUMMARY.md`
- `docs/history/CRITICAL_FIXES_APPLIED.md`

## 未来改动备忘录

- `docs/plans/FUTURE_APP_CHANGES.md` - 尚未排期的产品改动记录

### 复盘（Postmortem）

- `docs/history/postmortem/README.md`

## 测试命令（Vitest）

- `npm test`：CI 冒烟子集（`vitest.ci.config.ts`）
- `npm run test:all`：全量单元（`vitest.config.ts`）
- `npm run test:integration`：真实存储/API/SDK 路径集成测试，仅在 HTTP 边界使用 MSW
- `npm run test:coverage`：单元与集成合并的全生产源文件覆盖率
- `npm run test:mutation:critical`：关键领域逻辑变异门禁
- `npm run test:performance`：性能（`vitest.performance.config.ts`）
