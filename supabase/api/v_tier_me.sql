create schema if not exists api;

create or replace view api.v_tier_me as
WITH me AS (
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'sub' AS sub
)
SELECT
  u.id AS user_id,
  COALESCE(u.plan_tier::text, 'free') AS tier,
  (now() AT TIME ZONE 'utc') AS asof_utc
FROM me
JOIN public.users u ON u.id::text = me.sub;

-- ensure correct auth context
alter view api.v_tier_me set (security_invoker = true);

-- permissions (match current environment)
grant usage on schema api to authenticated, anon;
grant select on api.v_tier_me to authenticated, anon;
