# Momentum 项目代码质量评估与优化计划

## 一、"屎山"程度评估总结

| 维度 | 评分 | 说明 |
|------|------|------|
| **架构设计** | 8.2/10 | 三层架构清晰，存储抽象优秀 |
| **工程实践** | 6.2/10 | 构建配置好，但测试覆盖不足 |
| **代码质量** | 6.5/10 | 存在大文件、DRY违规、命名不一致 |
| **综合评分** | **7.0/10** | **中等偏上，不算"屎山"，但有明显改进空间** |

### 结论
这个项目**不是典型的"屎山"**。它有清晰的架构设计和良好的分层，但存在一些技术债务需要处理。

---

## 二、关键问题清单

### 高优先级问题

| 问题 | 文件 | 行数 | 影响 |
|------|------|------|------|
| 文件过大 | `ChainDetailView.tsx` | 604 | 10+内联组件，难以维护 |
| 文件过大 | `exceptionRuleCache.ts` | 554 | 40+方法，职责过多 |
| DRY违规 | 3个文件 | ~150行 | Levenshtein算法重复3次 |
| 魔法数字 | `exceptionRuleCache.ts` | 多处 | TTL值无常量定义 |
| 静默错误 | `EnhancedDuplicationHandler.ts` | 65行 | catch块无日志 |

### 中优先级问题

| 问题 | 说明 |
|------|------|
| 测试不足 | 集成测试仅2个文件，无E2E测试 |
| 命名不一致 | Service/Handler/Tracker/Monitor混用 |
| 接口过大 | MomentumStorage有40+方法，违反ISP |
| 无URL路由 | 无法分享链接、无浏览器历史 |

---

## 三、分阶段优化方案

### Phase 1: DRY违规修复（低风险，高收益）

**任务 1.1: 提取字符串工具函数**
- 创建 `src/utils/stringUtils.ts`
- 提取 `levenshteinDistance()` 和 `calculateSimilarity()`
- 更新以下文件的导入：
  - `src/services/RuleDuplicationDetector.ts`
  - `src/services/EnhancedDuplicationHandler.ts`
  - `src/utils/ruleSearchOptimizer.ts`

**任务 1.2: 提取缓存失效模式**
- 在 `exceptionRuleCache.ts` 中添加通用方法：
```typescript
private invalidateByPattern(predicate: (key: string) => boolean): void
```
- 重构所有失效方法使用此模式

**任务 1.3: 定义缓存常量**
- 创建 `src/constants/cache.ts`
- 定义 `CACHE_TTL` 常量对象

### Phase 2: 大文件拆分（中风险，高收益）

**任务 2.1: 拆分 ChainDetailView.tsx**
```
src/components/chain-detail/
├── ChainDetailView.tsx       (~100行)
├── ChainDetailHeader.tsx
├── ChainDetailStats.tsx
├── ChainDetailExceptions.tsx
├── ChainDetailHistory.tsx
├── DeleteConfirmModal.tsx
└── index.ts
```

**任务 2.2: 拆分 exceptionRuleCache.ts**
```
src/utils/cache/
├── CacheCore.ts              (~150行)
├── ExceptionRuleCache.ts     (~200行)
├── CacheTypes.ts
└── index.ts
```

### Phase 3: 测试补充（低风险，中收益）

- 为 `EnhancedDuplicationHandler.ts` 添加单元测试
- 扩展 `exceptionRuleCache.test.ts` 覆盖所有方法
- 添加集成测试：缓存失效、会话生命周期

### Phase 4: 命名规范化（低风险，低收益）

- 统一命名约定：
  - `*Service` - 业务逻辑
  - `*Manager` - 状态管理
  - `*Monitor` - 监控指标
  - `*Cache` - 缓存逻辑
- 更新 CLAUDE.md 文档

### Phase 5: 接口优化（高风险，中收益，可选）

- 拆分 MomentumStorage 为多个小接口
- 使用接口组合模式

---

## 四、关键文件路径

```
需要修改的文件：
├── src/components/ChainDetailView.tsx          (604行 → 拆分)
├── src/utils/exceptionRuleCache.ts             (554行 → 拆分)
├── src/services/EnhancedDuplicationHandler.ts  (DRY + 错误处理)
├── src/services/RuleDuplicationDetector.ts     (DRY)
├── src/utils/ruleSearchOptimizer.ts            (DRY)

需要创建的文件：
├── src/utils/stringUtils.ts                    (新建)
├── src/constants/cache.ts                      (新建)
├── src/components/chain-detail/                (新目录)
└── src/utils/cache/                            (新目录)
```

---

## 五、验证方法

1. **运行现有测试**
   ```bash
   npm test
   npm run typecheck
   npm run lint
   ```

2. **验证重构后功能**
   - 启动开发服务器：`npm run dev`
   - 测试链条详情页面显示
   - 测试异常规则缓存功能
   - 测试重复检测功能

3. **代码质量检查**
   - 确认所有文件 < 300 行
   - 确认无 TypeScript 错误
   - 确认无 ESLint 警告

---

## 六、风险评估

| 阶段 | 风险 | 缓解措施 |
|------|------|----------|
| Phase 1 | 低 | 小范围改动，有测试保护 |
| Phase 2 | 中 | 增量提取，保持向后兼容 |
| Phase 3 | 低 | 仅添加测试，不改功能 |
| Phase 4 | 低 | IDE重命名重构支持 |
| Phase 5 | 高 | 建议使用feature flag |

---

## 七、建议执行顺序

1. **立即执行**: Phase 1（DRY修复）- 收益高、风险低
2. **短期执行**: Phase 2（大文件拆分）- 改善可维护性
3. **中期执行**: Phase 3（测试补充）- 提高代码信心
4. **可选执行**: Phase 4-5 - 根据团队需求决定
