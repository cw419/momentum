-- Fix COALESCE type mismatch in create_write_session function
-- Error: COALESCE types text and interval cannot be matched
-- Problem: duration_minutes || ' minutes' returns text, but default is interval

DROP FUNCTION IF EXISTS create_write_session(text, integer);

CREATE OR REPLACE FUNCTION create_write_session(
  session_type text DEFAULT 'betting',
  duration_minutes integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  session_token uuid;
  session_duration interval;
  allowed_ops jsonb;
  max_ops integer;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Configure session based on type
  CASE session_type
    WHEN 'betting' THEN
      session_duration := CASE
        WHEN duration_minutes IS NOT NULL THEN (duration_minutes || ' minutes')::interval
        ELSE '5 minutes'::interval
      END;
      allowed_ops := '["INSERT:task_bets", "UPDATE:user_points", "INSERT:point_transactions", "INSERT:audit_logs", "UPDATE:task_bets"]'::jsonb;
      max_ops := 10;

    WHEN 'import' THEN
      session_duration := CASE
        WHEN duration_minutes IS NOT NULL THEN (duration_minutes || ' minutes')::interval
        ELSE '30 minutes'::interval
      END;
      allowed_ops := '["INSERT:chains", "INSERT:completion_history", "UPDATE:chains"]'::jsonb;
      max_ops := 1000;

    WHEN 'maintenance' THEN
      session_duration := CASE
        WHEN duration_minutes IS NOT NULL THEN (duration_minutes || ' minutes')::interval
        ELSE '60 minutes'::interval
      END;
      allowed_ops := '["UPDATE:*", "DELETE:*", "INSERT:*"]'::jsonb;
      max_ops := 10000;

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid session type: ' || session_type);
  END CASE;

  -- Clean up expired sessions of the same type
  DELETE FROM write_sessions
  WHERE user_id = current_user_id
    AND write_sessions.session_type = create_write_session.session_type
    AND (status = 'expired' OR expires_at < now());

  -- Check for existing active session of same type
  IF EXISTS (
    SELECT 1 FROM write_sessions
    WHERE user_id = current_user_id
      AND status = 'active'
      AND expires_at > now()
      AND write_sessions.session_type = create_write_session.session_type
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Active ' || session_type || ' session already exists'
    );
  END IF;

  -- Create new write session
  session_token := gen_random_uuid();

  INSERT INTO write_sessions (
    user_id,
    session_token,
    session_type,
    expires_at,
    max_duration,
    allowed_operations,
    max_operations,
    operation_count,
    status
  ) VALUES (
    current_user_id,
    session_token,
    session_type,
    now() + session_duration,
    session_duration,
    allowed_ops,
    max_ops,
    0,
    'active'
  );

  result := jsonb_build_object(
    'success', true,
    'session_token', session_token,
    'session_type', session_type,
    'expires_at', (now() + session_duration)::text,
    'allowed_operations', allowed_ops,
    'max_operations', max_ops,
    'duration_minutes', EXTRACT(EPOCH FROM session_duration) / 60
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_write_session(text, integer) TO authenticated;

SELECT 'create_write_session COALESCE type mismatch fixed' as result;
