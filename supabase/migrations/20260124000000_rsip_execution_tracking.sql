-- RSIP 执行追踪系统迁移
-- 为严格模式添加稳态阶段和执行追踪功能

-- 1. 扩展 rsip_nodes 表，添加稳态阶段和执行追踪字段
ALTER TABLE public.rsip_nodes
ADD COLUMN IF NOT EXISTS emoji TEXT,
ADD COLUMN IF NOT EXISTS stability_phase TEXT DEFAULT 'E0',
ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_violated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_violations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_violations INTEGER DEFAULT 0;

-- 2. 扩展 rsip_meta 表，添加严格模式相关字段
ALTER TABLE public.rsip_meta
ADD COLUMN IF NOT EXISTS last_tree_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_tree_open_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tree_open_streak INTEGER DEFAULT 0;

-- 3. 创建执行记录表
CREATE TABLE IF NOT EXISTS public.rsip_execution_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.rsip_nodes(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'violated', 'skipped')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 启用 RLS
ALTER TABLE public.rsip_execution_records ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略（使用优化的 auth.uid() 调用方式）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'rsip_execution_records'
    AND policyname = 'Users manage own execution records'
  ) THEN
    CREATE POLICY "Users manage own execution records"
      ON public.rsip_execution_records
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 6. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_rsip_execution_records_user
  ON public.rsip_execution_records(user_id);
CREATE INDEX IF NOT EXISTS idx_rsip_execution_records_node
  ON public.rsip_execution_records(node_id);
CREATE INDEX IF NOT EXISTS idx_rsip_execution_records_date
  ON public.rsip_execution_records(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsip_execution_records_status
  ON public.rsip_execution_records(status);

-- 7. 为 rsip_nodes 的新字段创建索引
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_stability_phase
  ON public.rsip_nodes(stability_phase);
CREATE INDEX IF NOT EXISTS idx_rsip_nodes_last_executed
  ON public.rsip_nodes(last_executed_at DESC);

-- 8. 添加约束确保 stability_phase 值有效
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rsip_nodes_stability_phase_check'
  ) THEN
    ALTER TABLE public.rsip_nodes
    ADD CONSTRAINT rsip_nodes_stability_phase_check
    CHECK (stability_phase IS NULL OR stability_phase IN ('E0', 'E1', 'E2'));
  END IF;
END $$;
