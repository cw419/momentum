# 代码库结构速览

## 顶层目录
- `src/`：应用主要代码
- `public/`：静态资源
- `supabase/`：Supabase 相关（如 migrations）
- `tools/`, `archive/`：工具/归档（eslint 默认忽略）
- `netlify.toml`, `deploy.ps1`, `DEPLOYMENT.md`：部署相关

## `src/` 关键子目录
- `src/app/`：UI/页面与应用壳相关
- `src/components/`：复用组件
- `src/hooks/domains/`：核心业务 domain hooks
- `src/storage/`：存储抽象与适配
- `src/infra/`：基础设施实现（如 Supabase 适配）
- `src/services/`：带生命周期的服务（通常在 `AppShellContainer.tsx` 管理 start/stop）
- `src/domain/`：领域对象/结果类型等
- `src/types/`：类型定义
- `src/utils/`：通用工具（env/logger/toast 等）
- `src/__tests__/`, `src/test/`：测试相关（eslint/tsconfig 默认 exclude）
