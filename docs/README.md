# Momentum 文档索引

本目录存放 Momentum 的开发者文档（架构、领域说明、部署与排错等）。

## 快速入口

- 架构总览：`docs/ARCHITECTURE.md`
- 数据库 Schema：`docs/DATABASE_SCHEMA.md`
- 部署：`docs/DEPLOYMENT.md`
- 调试：`docs/DEBUGGING_GUIDE.md`

## 领域文档

- `docs/DOMAIN_CHAINS.md`
- `docs/DOMAIN_SESSIONS.md`
- `docs/DOMAIN_RULES.md`
- `docs/DOMAIN_RSIP.md`
- `docs/DOMAIN_BETTING.md`
- `docs/DOMAIN_IMPORT_EXPORT.md`
- `docs/DOMAIN_RECYCLE_BIN.md`
- `docs/DOMAIN_GROUPS.md`

## 功能文档

- 宠物系统：`docs/PET_FEATURE.md`

## 复盘（Postmortem）

- `postmortem/README.md`

## 测试命令（Vitest）

- `npm test`：CI 冒烟子集（`vitest.ci.config.ts`）
- `npm run test:all`：全量单元（`vitest.config.ts`）
- `npm run test:integration`：集成（`vitest.integration.config.ts`）
- `npm run test:db`：DB（`vitest.db.config.ts`）
- `npm run test:performance`：性能（`vitest.performance.config.ts`）
