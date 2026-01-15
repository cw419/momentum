# Momentum 文档索引

本目录存放 Momentum 的开发者文档（架构、领域说明、部署与排错等）。

## 快速入口

- 架构总览：`docs/guides/ARCHITECTURE.md`
- 数据库 Schema：`docs/api/DATABASE_SCHEMA.md`
- 部署：`docs/guides/DEPLOYMENT.md`
- 调试：`docs/guides/DEBUGGING_GUIDE.md`

## 指南

- 入门：`docs/guides/for-beginners.md`
- 链编辑器：`docs/guides/CHAIN_EDITOR_GUIDE.md`
- 手动迁移：`docs/guides/apply-migration.md`
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
- 宠物系统：`docs/features/PET_FEATURE.md`
- 计时器：`docs/features/TIMER_FEATURE_SUMMARY.md`
- 分组视图增强：`docs/features/GROUP_VIEW_ENHANCEMENTS.md`
- 声音系统：`docs/features/SOUND_FEATURE.md`
- 回收箱（中文）：`docs/features/README-回收箱功能.md`
- 时间限定功能（中文）：`docs/features/时间限定功能说明.md`

## API

- 每日打卡 API：`docs/api/daily-checkin-api-guide.md`

## 历史记录

- `docs/history/FIXES_SUMMARY.md`
- `docs/history/TOUCH_FIX_SUMMARY.md`
- `docs/history/CRITICAL_FIXES_APPLIED.md`

### 复盘（Postmortem）

- `docs/history/postmortem/README.md`

## 测试命令（Vitest）

- `npm test`：CI 冒烟子集（`vitest.ci.config.ts`）
- `npm run test:all`：全量单元（`vitest.config.ts`）
- `npm run test:integration`：集成（`vitest.integration.config.ts`）
- `npm run test:db`：DB（`vitest.db.config.ts`）
- `npm run test:performance`：性能（`vitest.performance.config.ts`）
