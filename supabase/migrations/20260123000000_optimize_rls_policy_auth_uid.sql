/*
  # RLS Policy Performance + Safety

  - Performance: wrap `auth.uid()` in `SELECT` so it's evaluated once per query, not per-row.
  - Safety: ensure UPDATE policies also have `WITH CHECK` to prevent changing `user_id`.

  References:
  - https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
*/

-- =========================
-- Core app tables
-- =========================

-- chains
DROP POLICY IF EXISTS "Users can manage their own chains" ON public.chains;
CREATE POLICY "Users can manage their own chains"
  ON public.chains
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own chains" ON public.chains;
CREATE POLICY "Users can view their own chains"
  ON public.chains
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own chains" ON public.chains;
CREATE POLICY "Users can insert their own chains"
  ON public.chains
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own chains" ON public.chains;
CREATE POLICY "Users can update their own chains"
  ON public.chains
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own chains" ON public.chains;
CREATE POLICY "Users can delete their own chains"
  ON public.chains
  FOR DELETE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their deleted chains" ON public.chains;
CREATE POLICY "Users can view their deleted chains"
  ON public.chains
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can soft delete their chains" ON public.chains;
CREATE POLICY "Users can soft delete their chains"
  ON public.chains
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- scheduled_sessions
DROP POLICY IF EXISTS "Users can manage their own scheduled sessions" ON public.scheduled_sessions;
CREATE POLICY "Users can manage their own scheduled sessions"
  ON public.scheduled_sessions
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- active_sessions
DROP POLICY IF EXISTS "Users can manage their own active sessions" ON public.active_sessions;
CREATE POLICY "Users can manage their own active sessions"
  ON public.active_sessions
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- completion_history
DROP POLICY IF EXISTS "Users can manage their own completion history" ON public.completion_history;
CREATE POLICY "Users can manage their own completion history"
  ON public.completion_history
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================
-- RSIP
-- =========================

DROP POLICY IF EXISTS "Users manage their own RSIP nodes" ON public.rsip_nodes;
CREATE POLICY "Users manage their own RSIP nodes"
  ON public.rsip_nodes
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage their own RSIP meta" ON public.rsip_meta;
CREATE POLICY "Users manage their own RSIP meta"
  ON public.rsip_meta
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================
-- Daily check-in + points
-- =========================

DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points"
  ON public.user_points
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
CREATE POLICY "Users can update their own points"
  ON public.user_points
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own points record" ON public.user_points;
CREATE POLICY "Users can insert their own points record"
  ON public.user_points
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own checkins" ON public.daily_checkins;
CREATE POLICY "Users can view their own checkins"
  ON public.daily_checkins
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.daily_checkins;
CREATE POLICY "Users can insert their own checkins"
  ON public.daily_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.point_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.point_transactions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.point_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON public.point_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================
-- Gambling mode
-- =========================

DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Keep the permissive service insert policy as-is (role enforcement is via GRANTs).
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own bets" ON public.task_bets;
CREATE POLICY "Users can view their own bets"
  ON public.task_bets
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own bets" ON public.task_bets;
CREATE POLICY "Users can insert their own bets"
  ON public.task_bets
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

