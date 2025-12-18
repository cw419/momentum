# Momentum 项目概览

## 项目目的
Momentum 是一个基于心理学/行为经济学的专注与自控训练应用，核心理论为 CTDP（Chained Time-Delay Protocol）。通过“神圣座位原则 / 判例原则 / 线性时延原则”帮助用户建立习惯链条并完成专注任务。

- 在线地址：https://momentumctdp.netlify.app/
- 主要文档：`README.md`、`README_EN.md`

## 技术栈
- 前端：React 18 + TypeScript
- 构建：Vite 5（`npm run dev/build/preview`）
- 样式：TailwindCSS（`tailwind.config.js`，`src/index.css`）
- 存储：本地存储 + Supabase（`@supabase/supabase-js`，通过统一 storage 抽象切换）
- 测试：Vitest（多套配置：CI / all / integration / db / performance）
- 代码质量：ESLint 9 + typescript-eslint（`no-console` 强制）

## 运行环境
- Node.js 18+（Netlify/部署环境也固定为 18）
- 包管理：项目包含 `package-lock.json`，默认按 npm 工作流即可
