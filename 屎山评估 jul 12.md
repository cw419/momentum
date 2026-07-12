屎山指数：4/10\*\*（0 = 非常整洁，10 = 基本不可维护）。

项目不算真正的屎山，更准确的评价是：**工程基础扎实、测试很多，但存在中等规模的结构债和 CI 盲区。** 当前最大风险不是代码完全失控，而是部分检查“看起来很全面”，实际上没有覆盖 integration、Rust 默认构建和覆盖率退化。

### 证据

表现较好的部分：

- ESLint、TypeScript、Prettier、Knip 全部通过。
- 类型覆盖率 **99.75%**。
- Dependency Cruiser 扫描 **660 个模块、1700 条依赖，0 个架构违规**。
- 循环依赖为 **0**。
- 重复代码仅 **9 个克隆、0.29%**，不是主要问题。
- 完整单元测试：**217 个文件、1730 个测试全部通过**。
- 覆盖率：语句 **83.01%**、分支 **72.79%**。
- Rust `clippy --all-features -D warnings` 通过。
- 生产代码约 **618 个文件、6.3 万行**，测试代码约 5 万行，测试投入不低。

主要问题：

1. **CI 存在真实盲区。**  
   integration suite 有 1 个失败：测试把 `2026-02-01` 写成“recent”，到现在它早已超过 30 天。这是典型的测试随时间腐化，位置在 [localStorageAdapter.integration.test.ts](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src/storage/__tests__/localStorageAdapter.integration.test.ts:52)。这套测试目前没有进入 PR CI。

2. **Rust 构建口径不一致。**  
   默认 `cargo test` 因缺少 `tauri/tray-icon` 编译失败；加 `--features desktop` 后通过，但 Rust 目前是 **0 个测试**。根源是 [Cargo.toml](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src-tauri/Cargo.toml:31) 默认 feature 为空，而 [lib.rs](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src-tauri/src/lib.rs:36) 在 desktop 配置下使用托盘 API。

3. **大文件仍然较多。**  
   有 **24 个生产文件超过 300 行**，虽然已从基线 31 个下降，但仍说明职责聚合较重。优先关注：
   - `sessions/start.ts`：401 行
   - `sessions/completion.ts`：394 行
   - `useExceptionRuleFlow.ts`：391 行
   - `RSIPTaskLinkPanel.tsx`：386 行
   - `import/rsip.ts`：389 行

4. **严格死 API 检查失败。**  
   `ts-prune` 找到 10 个“仅模块内部使用却被 export”的类型或符号。数量不大，但会扩大重构影响面。

5. **SonarJS 有 30 个发现。**  
   其中 22 个是 `void-use`，可能包含刻意的 fire-and-forget；剩余包括嵌套条件、嵌套函数和未使用变量。当前报告是软门禁，噪音与真实问题没有分开。

6. **覆盖率没有阈值。**  
   `test:coverage` 会生成报告，却没有配置最低覆盖率，所以未来即使从 83% 跌到 50%，Required CI 仍可能通过。

## 建议优先级

**P0：先让 CI 说真话**

- 修复日期腐化测试，使用 fake timer 或基于 `Date.now()` 的相对日期。
- PR CI 加入 `test:integration`、`test:db`。
- 增加 Rust `fmt`、`clippy`、`cargo test --features desktop`。
- 设置覆盖率初始门槛：语句 80%、分支 70%，然后采用只升不降的 ratchet。

**P1：消化结构债**

- 把大文件预算接入 Required CI，而不只是 informational/nightly。
- 先拆 session start/completion：把持久化、错误恢复、状态变换和通知副作用分离。
- 将 `RSIPTaskLinkPanel` 拆成 controller hook、表单和列表展示。
- 目标先从 **24 个大文件降到 18 个以内**，不要为了行数机械拆文件。

**P2：降低门禁噪音**

- 清理 10 个无用公开导出，然后把严格 `ts-prune` 接入 CI。
- 对 SonarJS 的 `void-use` 明确团队约定：统一使用已有 `fireAndForget()`，或关闭不适合本项目的规则；其余 8 个发现清零。
- 给 `depcheck` 配置 `dependency-cruiser` 例外。目前它把 npm script 使用的 CLI 误报为未使用依赖。
- 针对低覆盖热点补测试，优先 `RSIPTaskLinkPanel`、platform adapters 和 platform capability center，而不是盲目追求全局 90%。
