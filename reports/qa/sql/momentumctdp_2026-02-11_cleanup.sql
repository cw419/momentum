-- Cleanup QA data generated in report:
-- reports/qa/momentumctdp_netlify_test_2026-02-11.md
--
-- Target user: 20260210@test.com
-- Targets:
--   - qa-chain-20260211-webtest
--   - qa-group-20260211-webtest
--
-- Note:
--   This script only deletes chains for that user with names matching qa-* entries.
--   Cascading children will follow existing FK / app behavior.

WITH target_user AS (
  SELECT id
  FROM auth.users
  WHERE email = '20260210@test.com'
  LIMIT 1
)
DELETE FROM public.chains c
USING target_user u
WHERE c.user_id = u.id
  AND c.name IN ('qa-chain-20260211-webtest', 'qa-group-20260211-webtest');

-- Show remaining qa* chains for transparency
WITH target_user AS (
  SELECT id
  FROM auth.users
  WHERE email = '20260210@test.com'
  LIMIT 1
)
SELECT c.id, c.name, c.type, c.created_at
FROM public.chains c
JOIN target_user u ON u.id = c.user_id
WHERE c.name ILIKE 'qa-%'
ORDER BY c.created_at DESC;
