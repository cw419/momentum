# SQL Scripts

本目录存放一次性/临时的 Supabase(Postgres) 调试、验证与修复脚本，**不会**被应用运行时自动执行。

## 使用建议

- 优先在**本地或测试环境**运行；线上请先在事务/只读查询下验证，再执行任何写入脚本。
- 多数脚本需要替换 `YOUR_USER_ID` 或脚本内的示例 `user_id`。
- 建议在 Supabase Dashboard 的 SQL Editor 中执行（或用 `psql` 连接）。

## 文件说明

- `check_bet_integrity.sql`：检查押注系统的数据一致性（孤儿交易/孤儿 bet 记录等）。
- `debug_betting_system.sql`：押注系统调试脚本（函数签名、用户积分、近期 bet 记录等）。
- `test_bet_atomicity.sql`：验证押注交易原子性修复的测试脚本（会创建测试数据）。

- `quick-database-fix.sql`：快速修复/补齐数据库字段与兼容性检查（包含 DDL/性能相关操作）。
- `quick-fix-database.sql`：一键补齐回收箱/时间限定相关字段（`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`）。
- `verify-database-fix.sql`：验证修复是否生效（字段、索引、统计、RLS 等检查）。

- `verify-all-chains.sql`：查看数据库内所有链条（含已删除）、并输出统计/字段存在性检查。
- `debug-deleted-chains.sql`：调试“已删除链条/回收箱”相关查询（含统计）。
- `test-soft-delete.sql`：测试软删除流程的查询与示例命令。
- `soft-delete-existing-chain.sql`：对指定用户的现有链条执行软删除（用于回收箱验证）。

- `create-test-deleted-chain.sql`：为指定用户创建测试链条（含软删除字段）。
- `simple-test-chain.sql`：最小化创建测试链条脚本（需替换用户 ID）。
- `quick-test-for-current-user.sql`：为脚本内硬编码的用户创建测试链条（请先替换为当前用户）。
