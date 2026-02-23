-- ========================================
-- Migrate Points Columns from integer to bigint
-- Date: 2026-02-23
-- Purpose: Fix "integer out of range" errors when points exceed ~2.1 billion
--
-- Root cause: PostgreSQL integer (int4) max = 2,147,483,647.
-- Users with points near this limit trigger overflow in:
--   1. place_task_bet: reward_payout := p_bet_amount * 2
--   2. settle_task_bet: new_points_total := user_current_points + payout_amount
--   3. Various CHECK constraints and INSERT/UPDATE operations
--
-- Solution: Migrate all points-related columns to bigint (int8, max ~9.2e18)
-- and rebuild all PL/pgSQL functions that declare integer variables for points.
-- ========================================

-- ============================================================
-- STEP 1: ALTER TABLE COLUMNS from integer to bigint
-- ============================================================
-- PostgreSQL ALTER COLUMN TYPE bigint is safe for integer -> bigint
-- (no data loss, implicit cast exists). CHECK constraints are preserved.

-- user_points
ALTER TABLE user_points
  ALTER COLUMN total_points TYPE bigint;

-- task_bets
ALTER TABLE task_bets
  ALTER COLUMN bet_amount TYPE bigint,
  ALTER COLUMN points_before TYPE bigint,
  ALTER COLUMN points_after TYPE bigint,
  ALTER COLUMN potential_payout TYPE bigint,
  ALTER COLUMN actual_payout TYPE bigint;

-- point_transactions
ALTER TABLE point_transactions
  ALTER COLUMN points_change TYPE bigint,
  ALTER COLUMN points_before TYPE bigint,
  ALTER COLUMN points_after TYPE bigint;

-- user_settings (bet limits)
ALTER TABLE user_settings
  ALTER COLUMN daily_bet_limit TYPE bigint,
  ALTER COLUMN max_single_bet TYPE bigint;

-- daily_checkins (for consistency)
ALTER TABLE daily_checkins
  ALTER COLUMN points_earned TYPE bigint;


-- ============================================================
-- STEP 2: Rebuild place_task_bet with bigint parameter
-- ============================================================
-- Must DROP old integer-signature function, then CREATE with bigint.

DROP FUNCTION IF EXISTS place_task_bet(uuid, uuid, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS place_task_bet(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS place_task_bet(uuid, uuid, bigint, uuid) CASCADE;
DROP FUNCTION IF EXISTS place_task_bet(uuid, uuid, bigint) CASCADE;

CREATE OR REPLACE FUNCTION place_task_bet(
  p_user_id uuid,
  p_session_id uuid,
  p_bet_amount bigint,
  p_write_session_token uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_current_points bigint := 0;
  session_exists boolean := false;
  session_chain_id uuid;
  existing_bet task_bets;
  gambling_enabled boolean := false;
  daily_spent bigint := 0;
  user_daily_limit bigint;
  user_max_bet bigint;
  new_bet_id uuid;
  reward_payout bigint;
  result jsonb;
BEGIN
  -- Log function entry for debugging
  INSERT INTO audit_logs (user_id, action, details, created_at)
  VALUES (
    p_user_id,
    'place_task_bet_v3_bigint_called',
    jsonb_build_object(
      'session_id', p_session_id,
      'bet_amount', p_bet_amount,
      'write_session_token', COALESCE(p_write_session_token::text, 'null'),
      'function_signature', 'place_task_bet(uuid,uuid,bigint,uuid DEFAULT NULL)'
    ),
    now()
  );

  -- Calculate reward payout: 2x bet amount (bet return + equal reward)
  reward_payout := p_bet_amount * 2;

  -- Verify the user exists and is the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only place bets for yourself';
  END IF;

  -- Validate bet amount
  IF p_bet_amount <= 0 THEN
    RAISE EXCEPTION 'Bet amount must be greater than 0';
  END IF;

  -- Check if gambling mode is enabled
  SELECT gambling_mode_enabled, daily_bet_limit, max_single_bet
  INTO gambling_enabled, user_daily_limit, user_max_bet
  FROM user_settings
  WHERE user_id = p_user_id;

  IF NOT gambling_enabled THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Gambling mode is not enabled',
      'error_code', 'GAMBLING_DISABLED'
    );
  END IF;

  -- Check single bet limit
  IF user_max_bet IS NOT NULL AND p_bet_amount > user_max_bet THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bet amount exceeds your maximum single bet limit',
      'error_code', 'BET_LIMIT_EXCEEDED',
      'max_bet', user_max_bet
    );
  END IF;

  -- Check daily betting limit
  IF user_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(bet_amount), 0) INTO daily_spent
    FROM task_bets
    WHERE user_id = p_user_id
      AND DATE(created_at) = CURRENT_DATE
      AND bet_status != 'cancelled'
      AND bet_status != 'refunded';

    IF daily_spent + p_bet_amount > user_daily_limit THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Daily betting limit would be exceeded',
        'error_code', 'DAILY_LIMIT_EXCEEDED',
        'daily_limit', user_daily_limit,
        'daily_spent', daily_spent
      );
    END IF;
  END IF;

  -- Verify session exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM active_sessions
    WHERE id = p_session_id AND user_id = p_user_id
  ), chain_id INTO session_exists, session_chain_id
  FROM active_sessions
  WHERE id = p_session_id AND user_id = p_user_id;

  IF NOT session_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Active session not found',
      'error_code', 'SESSION_NOT_FOUND'
    );
  END IF;

  -- Check if bet already exists for this session
  SELECT * INTO existing_bet
  FROM task_bets
  WHERE user_id = p_user_id AND session_id = p_session_id;

  IF existing_bet IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bet already placed on this session',
      'error_code', 'DUPLICATE_BET',
      'existing_bet_id', existing_bet.id,
      'existing_bet_amount', existing_bet.bet_amount
    );
  END IF;

  -- Get current user points with row locking
  SELECT COALESCE(total_points, 0) INTO user_current_points
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Create user_points record if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_points (user_id, total_points)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    user_current_points := 0;
  END IF;

  -- Check if user has sufficient points
  IF user_current_points < p_bet_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient points for bet',
      'error_code', 'INSUFFICIENT_POINTS',
      'current_points', user_current_points,
      'required_points', p_bet_amount
    );
  END IF;

  -- ATOMIC OPERATIONS: All operations must succeed or fail together

  -- Step 1: Create the bet record first
  INSERT INTO task_bets (
    user_id,
    session_id,
    chain_id,
    bet_amount,
    bet_status,
    points_before,
    potential_payout,
    metadata
  )
  VALUES (
    p_user_id,
    p_session_id,
    session_chain_id,
    p_bet_amount,
    'pending',
    user_current_points,
    reward_payout,
    jsonb_build_object(
      'placed_at', now(),
      'payout_ratio', '2x',
      'original_bet', p_bet_amount,
      'potential_reward', p_bet_amount,
      'function_version', 'v3_bigint',
      'write_session_token', COALESCE(p_write_session_token::text, 'null')
    )
  )
  RETURNING id INTO new_bet_id;

  -- Step 2: Deduct points from user balance
  UPDATE user_points
  SET total_points = total_points - p_bet_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Step 3: Record the transaction
  INSERT INTO point_transactions (
    user_id,
    transaction_type,
    points_change,
    points_before,
    points_after,
    description,
    reference_id
  )
  VALUES (
    p_user_id,
    'bet_placed',
    -p_bet_amount,
    user_current_points,
    user_current_points - p_bet_amount,
    'Placed bet (2x payout potential): ' || p_bet_amount::text || ' bet + ' || p_bet_amount::text || ' potential reward',
    new_bet_id
  );

  -- Step 4: Create success audit log
  INSERT INTO audit_logs (user_id, action, details, created_at)
  VALUES (
    p_user_id,
    'bet_placed_success_v3_bigint',
    jsonb_build_object(
      'bet_id', new_bet_id,
      'session_id', p_session_id,
      'chain_id', session_chain_id,
      'bet_amount', p_bet_amount,
      'potential_payout', reward_payout,
      'points_before', user_current_points,
      'points_after', user_current_points - p_bet_amount,
      'function_version', 'v3_bigint'
    ),
    NOW()
  );

  -- Build success result
  result := jsonb_build_object(
    'success', true,
    'message', 'Bet placed successfully (2x payout: bet return + equal reward)',
    'bet_id', new_bet_id,
    'bet_amount', p_bet_amount,
    'potential_payout', reward_payout,
    'potential_reward', p_bet_amount,
    'points_before', user_current_points,
    'points_after', user_current_points - p_bet_amount,
    'session_id', p_session_id,
    'chain_id', session_chain_id,
    'payout_explanation', '成功时获得: ' || p_bet_amount::text || '(返还) + ' || p_bet_amount::text || '(奖励) = ' || reward_payout::text || '积分'
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  INSERT INTO audit_logs (user_id, action, details, created_at)
  VALUES (
    p_user_id,
    'bet_placement_error_v3_bigint',
    jsonb_build_object(
      'session_id', p_session_id,
      'bet_amount', p_bet_amount,
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'function_version', 'v3_bigint'
    ),
    NOW()
  );

  -- Re-raise the exception to ensure transaction rollback
  RAISE EXCEPTION 'Bet placement failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION place_task_bet(uuid, uuid, bigint, uuid) TO authenticated;


-- ============================================================
-- STEP 3: Rebuild settle_task_bet with bigint variables
-- ============================================================

CREATE OR REPLACE FUNCTION settle_task_bet(
  bet_id uuid,
  task_successful boolean,
  completion_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bet_record task_bets;
  user_current_points bigint;
  payout_amount bigint := 0;
  new_points_total bigint;
  result jsonb;
BEGIN
  -- Get the bet record
  SELECT * INTO bet_record
  FROM task_bets
  WHERE id = bet_id;

  IF bet_record IS NULL THEN
    RAISE EXCEPTION 'Bet not found';
  END IF;

  -- Check if bet is already settled
  IF bet_record.bet_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bet is already settled',
      'error_code', 'ALREADY_SETTLED',
      'current_status', bet_record.bet_status
    );
  END IF;

  -- Get current user points
  SELECT total_points INTO user_current_points
  FROM user_points
  WHERE user_id = bet_record.user_id;

  -- Calculate payout
  IF task_successful THEN
    payout_amount := bet_record.potential_payout;
    new_points_total := user_current_points + payout_amount;
  ELSE
    payout_amount := 0;
    new_points_total := user_current_points;
  END IF;

  -- Start transaction for atomic operations
  BEGIN
    -- Update bet record
    UPDATE task_bets
    SET bet_status = CASE WHEN task_successful THEN 'won' ELSE 'lost' END,
        points_after = new_points_total,
        actual_payout = payout_amount,
        settled_at = now(),
        metadata = metadata || jsonb_build_object(
          'settled_at', now(),
          'completion_notes', completion_notes,
          'task_successful', task_successful
        )
    WHERE id = bet_id;

    -- If bet won, add points to user balance
    IF task_successful THEN
      UPDATE user_points
      SET total_points = total_points + payout_amount,
          updated_at = now()
      WHERE user_id = bet_record.user_id;

      -- Record the winning transaction
      INSERT INTO point_transactions (
        user_id,
        transaction_type,
        points_change,
        points_before,
        points_after,
        description,
        reference_id
      )
      VALUES (
        bet_record.user_id,
        'bet_won',
        payout_amount,
        user_current_points,
        new_points_total,
        'Won bet on task completion',
        bet_id
      );
    ELSE
      -- Record the losing transaction (no points change, just for audit)
      INSERT INTO point_transactions (
        user_id,
        transaction_type,
        points_change,
        points_before,
        points_after,
        description,
        reference_id
      )
      VALUES (
        bet_record.user_id,
        'bet_lost',
        0,
        user_current_points,
        user_current_points,
        'Lost bet on task failure',
        bet_id
      );
    END IF;

    -- Build result
    result := jsonb_build_object(
      'success', true,
      'message', CASE WHEN task_successful THEN 'Bet won!' ELSE 'Bet lost' END,
      'bet_id', bet_id,
      'bet_amount', bet_record.bet_amount,
      'payout', payout_amount,
      'task_successful', task_successful,
      'points_before', user_current_points,
      'points_after', new_points_total,
      'bet_status', CASE WHEN task_successful THEN 'won' ELSE 'lost' END
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Bet settlement failed: %', SQLERRM;
  END;
END;
$$;


-- ============================================================
-- STEP 4: Rebuild refund_task_bet with bigint variables
-- ============================================================

CREATE OR REPLACE FUNCTION refund_task_bet(bet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bet_record task_bets;
  user_current_points bigint;
  refund_amount bigint;
  new_points_total bigint;
  result jsonb;
BEGIN
  -- Get the bet record
  SELECT * INTO bet_record
  FROM task_bets
  WHERE id = bet_id;

  IF bet_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bet not found',
      'bet_id', bet_id
    );
  END IF;

  -- Check if bet is already settled or refunded
  IF bet_record.bet_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bet is already settled or refunded',
      'error_code', 'ALREADY_PROCESSED',
      'current_status', bet_record.bet_status
    );
  END IF;

  -- Get current user points
  SELECT total_points INTO user_current_points
  FROM user_points
  WHERE user_id = bet_record.user_id;

  refund_amount := bet_record.bet_amount;
  new_points_total := user_current_points + refund_amount;

  -- Start transaction for atomic operations
  BEGIN
    -- Update bet record as refunded
    UPDATE task_bets
    SET bet_status = 'refunded',
        points_after = new_points_total,
        actual_payout = refund_amount,
        settled_at = now(),
        cancellation_reason = 'Session cancelled - bet refunded',
        metadata = metadata || jsonb_build_object(
          'refunded_at', now(),
          'refund_reason', 'session_cancelled',
          'refund_amount', refund_amount
        )
    WHERE id = bet_id;

    -- Return points to user balance
    UPDATE user_points
    SET total_points = total_points + refund_amount,
        updated_at = now()
    WHERE user_id = bet_record.user_id;

    -- Record the refund transaction
    INSERT INTO point_transactions (
      user_id,
      transaction_type,
      points_change,
      points_before,
      points_after,
      description,
      reference_id
    )
    VALUES (
      bet_record.user_id,
      'bet_refunded',
      refund_amount,
      user_current_points,
      new_points_total,
      'Bet refunded due to session cancellation',
      bet_id
    );

    result := jsonb_build_object(
      'success', true,
      'message', 'Bet refunded successfully',
      'bet_id', bet_id,
      'refund_amount', refund_amount,
      'points_before', user_current_points,
      'points_after', new_points_total
    );

    RETURN result;
  END;
END;
$$;


-- ============================================================
-- STEP 5: Rebuild perform_daily_checkin with bigint variables
-- ============================================================

CREATE OR REPLACE FUNCTION perform_daily_checkin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date_local date := CURRENT_DATE;
  existing_checkin daily_checkins;
  last_checkin daily_checkins;
  consecutive_days integer := 1;
  points_to_award bigint := 10;
  user_current_points bigint := 0;
  new_checkin_id uuid;
  result jsonb;
BEGIN
  -- Verify the user exists and is the authenticated user
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only check in for yourself';
  END IF;

  -- Check if user already checked in today
  SELECT * INTO existing_checkin
  FROM daily_checkins
  WHERE user_id = target_user_id AND checkin_date = current_date_local;

  IF existing_checkin IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already checked in today',
      'already_checked_in', true,
      'checkin_date', existing_checkin.checkin_date,
      'points_earned', 0,
      'consecutive_days', existing_checkin.consecutive_days
    );
  END IF;

  -- Get the most recent check-in to calculate consecutive days
  SELECT * INTO last_checkin
  FROM daily_checkins
  WHERE user_id = target_user_id
  ORDER BY checkin_date DESC
  LIMIT 1;

  -- Calculate consecutive days
  IF last_checkin IS NOT NULL THEN
    IF last_checkin.checkin_date = current_date_local - INTERVAL '1 day' THEN
      consecutive_days := last_checkin.consecutive_days + 1;
    ELSE
      consecutive_days := 1;
    END IF;
  END IF;

  -- Get current user points, create record if doesn't exist
  SELECT total_points INTO user_current_points
  FROM user_points
  WHERE user_id = target_user_id;

  IF user_current_points IS NULL THEN
    INSERT INTO user_points (user_id, total_points)
    VALUES (target_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    user_current_points := 0;
  END IF;

  -- Start transaction for atomic operations
  BEGIN
    -- Insert the new check-in record
    INSERT INTO daily_checkins (user_id, checkin_date, points_earned, consecutive_days)
    VALUES (target_user_id, current_date_local, points_to_award, consecutive_days)
    RETURNING id INTO new_checkin_id;

    -- Update user's total points
    UPDATE user_points
    SET total_points = total_points + points_to_award,
        updated_at = now()
    WHERE user_id = target_user_id;

    -- Record the transaction
    INSERT INTO point_transactions (
      user_id,
      transaction_type,
      points_change,
      points_before,
      points_after,
      description,
      reference_id
    )
    VALUES (
      target_user_id,
      'checkin',
      points_to_award,
      user_current_points,
      user_current_points + points_to_award,
      'Daily check-in reward',
      new_checkin_id
    );

    -- Build success result
    result := jsonb_build_object(
      'success', true,
      'message', 'Check-in successful!',
      'already_checked_in', false,
      'checkin_date', current_date_local,
      'points_earned', points_to_award,
      'consecutive_days', consecutive_days,
      'total_points', user_current_points + points_to_award,
      'checkin_id', new_checkin_id
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Check-in failed: %', SQLERRM;
  END;
END;
$$;


-- ============================================================
-- STEP 6: Rebuild get_user_gambling_stats with bigint variables
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_gambling_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_bets bigint := 0;
  total_wagered bigint := 0;
  total_won bigint := 0;
  total_lost bigint := 0;
  net_profit bigint := 0;
  win_rate numeric := 0;
  current_points bigint := 0;
  gambling_enabled boolean := false;
  biggest_win bigint := 0;
  biggest_loss bigint := 0;
  current_streak integer := 0;
  longest_streak integer := 0;
  result jsonb;
BEGIN
  -- Verify access
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only view your own gambling stats';
  END IF;

  -- Get current points and gambling settings
  SELECT COALESCE(up.total_points, 0), COALESCE(us.gambling_mode_enabled, false)
  INTO current_points, gambling_enabled
  FROM user_points up
  FULL OUTER JOIN user_settings us ON up.user_id = us.user_id
  WHERE up.user_id = target_user_id OR us.user_id = target_user_id;

  -- Get betting statistics
  SELECT
    COUNT(*),
    COALESCE(SUM(bet_amount), 0),
    COALESCE(SUM(CASE WHEN bet_status = 'won' THEN actual_payout ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE bet_status = 'lost'),
    COALESCE(MAX(CASE WHEN bet_status = 'won' THEN actual_payout ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN bet_status = 'lost' THEN bet_amount ELSE 0 END), 0)
  INTO total_bets, total_wagered, total_won, total_lost, biggest_win, biggest_loss
  FROM task_bets
  WHERE user_id = target_user_id
    AND bet_status IN ('won', 'lost');

  -- Calculate net profit/loss
  net_profit := total_won - (total_bets * (total_wagered / GREATEST(total_bets, 1)));

  -- Calculate win rate
  IF total_bets > 0 THEN
    win_rate := (total_bets - total_lost) * 100.0 / total_bets;
  END IF;

  -- Calculate current winning/losing streak
  WITH recent_bets AS (
    SELECT bet_status,
           ROW_NUMBER() OVER (ORDER BY settled_at DESC) as rn
    FROM task_bets
    WHERE user_id = target_user_id
      AND bet_status IN ('won', 'lost')
      AND settled_at IS NOT NULL
    ORDER BY settled_at DESC
    LIMIT 50
  ),
  streak_calc AS (
    SELECT bet_status,
           rn,
           rn - ROW_NUMBER() OVER (PARTITION BY bet_status ORDER BY rn) as streak_group
    FROM recent_bets
  )
  SELECT COUNT(*) INTO current_streak
  FROM streak_calc
  WHERE streak_group = (SELECT streak_group FROM streak_calc WHERE rn = 1);

  -- Build result
  result := jsonb_build_object(
    'user_id', target_user_id,
    'gambling_enabled', gambling_enabled,
    'current_points', current_points,
    'total_bets', total_bets,
    'total_wagered', total_wagered,
    'total_won', total_won,
    'total_lost', total_lost,
    'net_profit', net_profit,
    'win_rate', ROUND(win_rate, 2),
    'biggest_win', biggest_win,
    'biggest_loss', biggest_loss,
    'current_streak', current_streak
  );

  RETURN result;
END;
$$;


-- ============================================================
-- STEP 7: Rebuild get_user_checkin_stats with bigint variables
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_checkin_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_points bigint := 0;
  total_checkins integer := 0;
  current_streak integer := 0;
  longest_streak integer := 0;
  last_checkin_date date;
  has_checked_in_today boolean := false;
  result jsonb;
BEGIN
  -- Verify access
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only view your own stats';
  END IF;

  -- Get total points
  SELECT COALESCE(up.total_points, 0) INTO total_points
  FROM user_points up
  WHERE up.user_id = target_user_id;

  -- Get total check-ins
  SELECT COUNT(*) INTO total_checkins
  FROM daily_checkins dc
  WHERE dc.user_id = target_user_id;

  -- Get current streak
  SELECT consecutive_days, checkin_date INTO current_streak, last_checkin_date
  FROM daily_checkins
  WHERE user_id = target_user_id
  ORDER BY checkin_date DESC
  LIMIT 1;

  -- Check if streak is still active
  IF last_checkin_date IS NOT NULL THEN
    IF last_checkin_date = CURRENT_DATE THEN
      has_checked_in_today := true;
    ELSIF last_checkin_date < CURRENT_DATE - INTERVAL '1 day' THEN
      current_streak := 0;
    END IF;
  END IF;

  -- Get longest streak
  SELECT COALESCE(MAX(consecutive_days), 0) INTO longest_streak
  FROM daily_checkins
  WHERE user_id = target_user_id;

  -- Build result
  result := jsonb_build_object(
    'user_id', target_user_id,
    'total_points', total_points,
    'total_checkins', total_checkins,
    'current_streak', COALESCE(current_streak, 0),
    'longest_streak', longest_streak,
    'last_checkin_date', last_checkin_date,
    'has_checked_in_today', has_checked_in_today
  );

  RETURN result;
END;
$$;


-- ============================================================
-- STEP 8: Re-grant permissions (some may have been lost by CASCADE)
-- ============================================================

GRANT EXECUTE ON FUNCTION place_task_bet(uuid, uuid, bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_gambling_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_betting_history(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION perform_daily_checkin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_checkin_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_checkin_history(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_task_with_betting(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_task_bet(uuid) TO authenticated;


-- ============================================================
-- STEP 9: Verification
-- ============================================================

DO $$
DECLARE
  col_type text;
  func_count integer;
BEGIN
  -- Verify user_points.total_points is bigint
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'user_points' AND column_name = 'total_points';

  IF col_type != 'bigint' THEN
    RAISE EXCEPTION 'user_points.total_points is still %, expected bigint', col_type;
  END IF;

  -- Verify task_bets.bet_amount is bigint
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'task_bets' AND column_name = 'bet_amount';

  IF col_type != 'bigint' THEN
    RAISE EXCEPTION 'task_bets.bet_amount is still %, expected bigint', col_type;
  END IF;

  -- Verify place_task_bet function exists with bigint parameter
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'place_task_bet'
    AND n.nspname = 'public';

  IF func_count = 0 THEN
    RAISE EXCEPTION 'place_task_bet function not found after migration';
  END IF;

  RAISE NOTICE '=== Migration Verification Passed ===';
  RAISE NOTICE 'user_points.total_points: bigint';
  RAISE NOTICE 'task_bets.bet_amount: bigint';
  RAISE NOTICE 'place_task_bet functions: %', func_count;
  RAISE NOTICE 'All points columns migrated to bigint successfully';
END $$;
