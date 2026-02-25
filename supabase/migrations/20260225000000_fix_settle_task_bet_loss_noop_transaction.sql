-- ========================================
-- Fix settle_task_bet loss settlement (no 0-point transaction)
-- Date: 2026-02-25
--
-- Background:
-- - point_transactions.points_change historically has CHECK (points_change != 0)
-- - settle_task_bet previously inserted a 'bet_lost' point_transactions row with points_change = 0
--   which can cause bet settlement to fail.
-- - When settlement fails, the bet stays 'pending' and may be refunded on active_sessions deletion,
--   making "lost bets" effectively free (no points deducted).
--
-- Fix:
-- - Only write point_transactions rows when there is an actual points delta.
-- - On bet loss, record state on task_bets only.
-- ========================================

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

    -- If bet won, add points to user balance and record a transaction
    IF task_successful THEN
      UPDATE user_points
      SET total_points = total_points + payout_amount,
          updated_at = now()
      WHERE user_id = bet_record.user_id;

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

