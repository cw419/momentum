Momentum 不是典型“无测试、无类型、复制粘贴遍地”的屎山，更像是：

> 工具链很先进，但部分门禁形同虚设；业务增长速度开始超过架构治理速度。

综合“屎山指数”：**4.5 / 10**（10 表示最难维护）。  
代码基础不错，但分层契约、中心模块和 CI 可信度已有明显风险。

## 静态分析结果

| 维度               |                                       结果 | 判断                            |
| ------------------ | -----------------------------------------: | ------------------------------- |
| TypeScript         |                              `strict` 通过 | 良好                            |
| 类型覆盖           |                    99.73%，80,366 / 80,579 | 很好，但仍有 213 个不安全表达式 |
| ESLint             |                                 主规则通过 | 良好                            |
| SonarJS            |                                      32 条 | 中等债务                        |
| dependency-cruiser |          28 条分层违规，其中 22 条生产代码 | 高风险                          |
| Madge              |                               1 个循环依赖 | 需尽快处理                      |
| Knip               |            13 个未使用导出、9 个未使用类型 | 中低风险                        |
| jscpd              |                    10 个克隆，重复率 0.31% | 很好                            |
| 大文件             |                       27 个文件超过 300 行 | 中高风险                        |
| 格式检查           |                   54 个文件不符合 Prettier | CI 当前不干净                   |
| Semgrep            |                            35 条阻断级发现 | 主要是 CI 供应链问题            |
| Rust Clippy        |                               严格模式通过 | 很好                            |
| Rustfmt            |                       2 个 Rust 文件不通过 | 低风险                          |
| 测试静态检查       | 224 个测试文件，测试 ESLint 和断言检查通过 | 良好                            |

本次仅做静态审计，没有执行完整测试、覆盖率或生产构建。

## 最重要的问题

### 1. 架构门禁实际失效

[package.json](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/package.json:45) 使用：

```text
depcruise ... --output-type text
```

该命令返回 0，但 JSON 结果包含 28 条错误。换成 `--output-type err` 后正确返回退出码 28。

生产代码中有 22 条违规，包括：

- [AppShellContainer.tsx](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src/app/AppShellContainer.tsx:3) 直接依赖 `useStorage`
- [Dashboard.tsx](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src/components/Dashboard.tsx:23) 同时依赖 `ports`、`useStorage`、`useStorageMode`
- `AccountModal`、`AuthForm`、`AuthWrapper`、`ImportExportModalContainer` 等也直接进入 storage 层

同时，[架构规则](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/.dependency-cruiser.cjs:29) 与仓库文档中“UI 可使用 `useStorage()`”的描述存在矛盾。

建议最高优先级处理：

1. 明确容器、领域 Hook、Storage Context 的合法边界。
2. 将门禁改为能返回非零退出码的 reporter。
3. 排除测试文件或给测试定义独立规则。
4. 增加一个故意制造违规并断言 CI 失败的治理测试。

### 2. 三个高耦合热点

- [Dashboard.tsx](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src/components/Dashboard.tsx)：492 行、20 个内部依赖
- [AppShellContainer.tsx](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src/app/AppShellContainer.tsx)：400 行、22 个内部依赖
- [SupabaseStorage.ts](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src/infra/storage/supabase/SupabaseStorage.ts)：424 行、15 个内部依赖

项目有 603 个生产 TS/TSX 文件、约 62,172 行；P95 文件长度已经达到 296 行。大文件基线从 31 降到 27 是好趋势，但这些“又大又中心”的模块仍会显著放大修改风险。

建议：

- `Dashboard` 继续拆成 Container、View 和 section view-model。
- `AppShellContainer` 将加载、生命周期、导航和 modal orchestration 分成独立协调器。
- `SupabaseStorage` 只保留组合与接口适配，具体能力继续下沉到表模块。
- 将长期目标设为生产文件 P95 ≤ 220 行、中心模块 fan-out ≤ 12。

### 3. 循环依赖

循环链路：

```text
rsipRecommender.ts
  ↔ rsipHighRiskRecommenders.ts
```

原因是 [rsipHighRiskRecommenders.ts](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/src/services/rsip-insights/rsipHighRiskRecommenders.ts:6) 回头导入 `localize` 和 `joinList`。

应把这两个无状态工具移动到 `rsipLocalization.ts`，让两个 recommender 单向依赖公共模块。

### 4. 质量门禁存在“预算贴线”现象

债务门禁虽然通过，但部分上限接近当前值：

- 重复克隆：10，上限 11
- 重复率：0.31%，上限 0.35%
- 非空断言：34，上限 70
- `as unknown as`：7，上限 30

建议不要只靠“低于历史基线”维持绿色。特别应优先清理 Supabase mapper、序列化和导入导出边界的不安全断言，用 Zod schema 或类型守卫替代。

### 5. CI 和安全卫生

Semgrep 找到 35 条问题：

- 34 个 GitHub Actions 使用可变版本标签，例如 `actions/checkout@v4`
- [tauri-build.yml](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/.github/workflows/tauri-build.yml:261) 有 GitHub context 直接插入 shell 的告警

建议将第三方 Action 固定到完整 commit SHA，并通过 `env:` 传递、引用 GitHub context。

另外，Prettier 有 54 个文件不通过，Rustfmt 也不通过；而 [必需 CI](C:/Users/xfc05/Downloads/momentum/momentum-new-feature-branch/package.json:46) 把格式检查放在首位，因此当前提交状态理论上无法通过必需流水线。

## 推荐实施顺序

1. **立即处理**：修复 architecture gate 退出码，统一文档与分层规则。
2. **本迭代**：消除 RSIP 循环依赖，格式化 54 个前端文件和 2 个 Rust 文件。
3. **下个迭代**：拆分 Dashboard、AppShellContainer、SupabaseStorage 三个中心热点。
4. **持续治理**：清理 22 个无用导出，将 module-local 函数取消 `export`。
5. **安全治理**：固定 GitHub Action SHA，修复 workflow shell 插值。
6. **规则降噪**：SonarJS 的 32 条中有 22 条是 `void-use`，应统一通过现有 `fireAndForget()` 表达异步意图，或针对该模式调整规则；其余嵌套函数、嵌套三元、空块和 TODO 应直接清理
