-- Daily check-ins use a fixed New York business day: 08:00 through 07:59.
-- Storing the business-day date keeps the existing unique(user_id, checkin_date)
-- constraint authoritative for both duplicate prevention and streak calculation.

CREATE OR REPLACE FUNCTION perform_daily_checkin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_checkin_date date :=
    ((now() AT TIME ZONE 'America/New_York') - INTERVAL '8 hours')::date;
  existing_checkin daily_checkins;
  last_checkin daily_checkins;
  consecutive_days integer := 1;
  points_to_award bigint := 10;
  user_current_points bigint := 0;
  new_checkin_id uuid;
  result jsonb;
BEGIN
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only check in for yourself';
  END IF;

  SELECT * INTO existing_checkin
  FROM daily_checkins
  WHERE user_id = target_user_id AND checkin_date = current_checkin_date;

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

  SELECT * INTO last_checkin
  FROM daily_checkins
  WHERE user_id = target_user_id
  ORDER BY checkin_date DESC
  LIMIT 1;

  IF last_checkin IS NOT NULL THEN
    IF last_checkin.checkin_date = current_checkin_date - INTERVAL '1 day' THEN
      consecutive_days := last_checkin.consecutive_days + 1;
    END IF;
  END IF;

  SELECT total_points INTO user_current_points
  FROM user_points
  WHERE user_id = target_user_id;

  IF user_current_points IS NULL THEN
    INSERT INTO user_points (user_id, total_points)
    VALUES (target_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    user_current_points := 0;
  END IF;

  BEGIN
    INSERT INTO daily_checkins (
      user_id,
      checkin_date,
      points_earned,
      consecutive_days
    )
    VALUES (
      target_user_id,
      current_checkin_date,
      points_to_award,
      consecutive_days
    )
    RETURNING id INTO new_checkin_id;

    UPDATE user_points
    SET total_points = total_points + points_to_award,
        updated_at = now()
    WHERE user_id = target_user_id;

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

    result := jsonb_build_object(
      'success', true,
      'message', 'Check-in successful!',
      'already_checked_in', false,
      'checkin_date', current_checkin_date,
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

CREATE OR REPLACE FUNCTION get_user_checkin_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_checkin_date date :=
    ((now() AT TIME ZONE 'America/New_York') - INTERVAL '8 hours')::date;
  total_points bigint := 0;
  total_checkins integer := 0;
  current_streak integer := 0;
  longest_streak integer := 0;
  last_checkin_date date;
  has_checked_in_today boolean := false;
  result jsonb;
BEGIN
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only view your own stats';
  END IF;

  SELECT COALESCE(up.total_points, 0) INTO total_points
  FROM user_points up
  WHERE up.user_id = target_user_id;

  SELECT COUNT(*) INTO total_checkins
  FROM daily_checkins dc
  WHERE dc.user_id = target_user_id;

  SELECT consecutive_days, checkin_date INTO current_streak, last_checkin_date
  FROM daily_checkins
  WHERE user_id = target_user_id
  ORDER BY checkin_date DESC
  LIMIT 1;

  IF last_checkin_date IS NOT NULL THEN
    IF last_checkin_date = current_checkin_date THEN
      has_checked_in_today := true;
    ELSIF last_checkin_date < current_checkin_date - INTERVAL '1 day' THEN
      current_streak := 0;
    END IF;
  END IF;

  SELECT COALESCE(MAX(consecutive_days), 0) INTO longest_streak
  FROM daily_checkins
  WHERE user_id = target_user_id;

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
