# legacy-tests

这里存放已确认**过时/失效**的测试文件（通常与当前架构或存储接口不一致），先保留作为参考。

约定：

- 这些文件**不参与** `npm test` / `npm run test:integration` 等正式测试套件。
- 若需要恢复：先对照当前 `MomentumStorage`/服务接口重写或拆分为更小的可维护测试，再迁回 `src/`。
