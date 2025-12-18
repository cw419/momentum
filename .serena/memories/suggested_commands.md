# 建议常用命令（Windows / PowerShell）

## 安装依赖
- `npm install`

## 开发/构建/预览
- `npm run dev`：启动 Vite 开发服务器
- `npm run build`：生产构建（输出到 `dist/`）
- `npm run preview`：本地预览生产构建

## 质量与类型检查
- `npm run lint`：运行 ESLint
- `npm run typecheck`：TypeScript 类型检查（`tsconfig.app.json`，noEmit）

## 测试（Vitest）
- `npm test`：CI 安全子集（使用 `vitest.ci.config.ts`）
- `npm run test:watch`
- `npm run test:coverage`
- `npm run test:all`：全量测试（`vitest.config.ts`）
- `npm run test:all:watch`
- `npm run test:integration`：集成测试
- `npm run test:db`：数据库相关测试
- `npm run test:performance`：性能测试

## 部署（Netlify）
- `./deploy.ps1`：一键部署脚本（见 `DEPLOYMENT.md`）
- 手动：`npm run build` 后 `netlify deploy --prod --dir=dist`

## 常用仓库检索（推荐）
- `rg "pattern"`：快速全文搜索（ripgrep）
- `Get-ChildItem -Recurse`：PowerShell 递归列目录
