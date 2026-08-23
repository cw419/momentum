/*
  # 高性能数据库优化迁移

  This migration intentionally runs after the base chains schema, group time
  limit fields, and soft-delete fields have been created.
*/

-- 为 chains 表添加高性能复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_user_performance
  ON chains(user_id, deleted_at, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_search_optimization
  ON chains(user_id, name, trigger)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_stats_optimization
  ON chains(user_id, total_completions DESC, current_streak DESC)
  WHERE deleted_at IS NULL;

-- 为 active_sessions 表添加分析索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_sessions_performance
  ON active_sessions(user_id, chain_id, started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_sessions_status
  ON active_sessions(user_id, is_paused, started_at DESC);

-- 为 completion_history 表添加分析索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_completion_history_analytics
  ON completion_history(chain_id, completed_at DESC, was_successful);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_completion_history_user_stats
  ON completion_history(user_id, completed_at DESC)
  WHERE was_successful = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_last_activity
  ON chains(user_id, last_completed_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- 为 JSON 字段创建 GIN 索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_exceptions_gin
  ON chains USING GIN(exceptions)
  WHERE jsonb_array_length(exceptions) > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chains_time_limit_exceptions_gin
  ON chains USING GIN(time_limit_exceptions)
  WHERE jsonb_array_length(time_limit_exceptions) > 0;

-- 创建物化视图优化统计查询
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_chain_stats AS
SELECT
  user_id,
  COUNT(*) AS total_chains,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) AS active_chains,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) AS deleted_chains,
  SUM(total_completions) AS total_completions,
  SUM(total_failures) AS total_failures,
  AVG(current_streak) AS avg_current_streak,
  MAX(current_streak) AS max_current_streak,
  COUNT(CASE WHEN current_streak > 0 THEN 1 END) AS chains_with_streaks,
  MIN(created_at) AS first_chain_created,
  MAX(last_completed_at) AS last_activity
FROM chains
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_chain_stats_user_id
  ON mv_user_chain_stats(user_id);

CREATE OR REPLACE FUNCTION refresh_user_chain_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_chain_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION schedule_stats_refresh()
RETURNS void AS $$
BEGIN
  -- pg_cron scheduling can be enabled separately when available.
  NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON INDEX idx_chains_user_performance IS
  'Primary index for user chain queries';
COMMENT ON INDEX idx_chains_search_optimization IS
  'Search optimization index for name and trigger';
COMMENT ON INDEX idx_completion_history_analytics IS
  'Performance index for completion history analytics';

ANALYZE chains;
ANALYZE active_sessions;
ANALYZE completion_history;
ANALYZE scheduled_sessions;
