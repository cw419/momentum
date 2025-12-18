# 完成任务后的建议检查清单

- 运行 `npm run typecheck`（避免 TS 破坏）
- 运行 `npm run lint`（确保无 `console.*` 等违规）
- 若改动涉及逻辑：优先跑相关测试；不确定时跑 `npm test`，需要更强覆盖再跑 `npm run test:all`
- 如影响构建/依赖：跑 `npm run build`（确保 Vite 构建通过）
- 如涉及 Supabase：确认 `.env` 中 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 配置（模板见 `.env.example`）
