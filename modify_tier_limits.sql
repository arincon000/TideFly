-- Modify the tier limits function to allow unlimited tier
-- Run this in Supabase SQL editor

-- 1. First, let's see the current trigger function
-- (You already showed us the function above)

-- 2. Modify the function to handle unlimited tier
CREATE OR REPLACE FUNCTION trg_alert_rules_guard_tier()
RETURNS TRIGGER AS $$
declare
  uid uuid := coalesce(new.user_id, old.user_id, auth.uid());
  tier text;
  created_limit int;
  active_limit  int;
  v_created int;
  v_active  int;
  turning_active boolean;
begin
  if uid is null then
    raise exception 'Missing user context: provide NEW.user_id or run as authenticated user'
      using errcode = 'P0001';
  end if;

  -- Determine tier (same source you're already using)
  select coalesce(plan_tier::text, 'free') into tier
  from public.users
  where id = uid;

  -- Limits (Phase 2 — Lean) - MODIFIED TO SUPPORT UNLIMITED TIER
  if tier = 'unlimited' then
    -- Unlimited tier: no limits
    created_limit := 999999;
    active_limit  := 999999;
  elsif tier = 'pro' then
    created_limit := 10;
    active_limit  := 5;
  else
    created_limit := 3;
    active_limit  := 1;
  end if;

  -- Current usage
  select count(*) into v_created
  from public.alert_rules r
  where r.user_id = uid;

  select count(*) into v_active
  from public.alert_rules r
  where r.user_id = uid
    and r.is_active = true
    -- align with your usage view: active = not paused and not expired
    and (r.paused_until is null or r.paused_until <= now())
    and (r.expires_at  is null or r.expires_at  >= current_date);

  -- Are we turning the rule active now?
  turning_active := (tg_op = 'INSERT' and coalesce(new.is_active,false))
                 or (tg_op = 'UPDATE' and coalesce(old.is_active,false) = false and coalesce(new.is_active,false) = true);

  -- Enforce created cap on INSERT
  if tg_op = 'INSERT' and v_created >= created_limit then
    raise exception 'Alert limit reached for tier %: created %/%',
      tier, v_created, created_limit using errcode = 'P0001';
  end if;

  -- Enforce active cap when turning active
  if turning_active and v_active >= active_limit then
    raise exception 'Active alert limit reached for tier %: active %/%',
      tier, v_active, active_limit using errcode = 'P0001';
  end if;

  return new;
end;
$$ LANGUAGE plpgsql;

-- 3. Update your test user to unlimited tier (if not already done)
UPDATE users 
SET plan_tier = 'unlimited', 
    plan_expires_at = '2026-12-31T23:59:59Z'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 4. Verify the change
SELECT 
    id,
    email,
    plan_tier,
    plan_expires_at
FROM users 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 5. Test that unlimited tier works by trying to create multiple alerts
-- (This will be tested by your Python script)