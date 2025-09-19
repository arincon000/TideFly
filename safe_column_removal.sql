-- Safe column removal script
-- This will help us remove min_nights and max_nights columns safely

-- Step 1: First, let's see what the v1_alert_rules view looks like
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'v1_alert_rules' AND schemaname = 'api';

-- Step 2: Create a backup of the view definition (in case we need to restore it)
-- We'll need to manually copy the output from Step 1

-- Step 3: Drop the view first (this will allow us to drop the columns)
DROP VIEW IF EXISTS api.v1_alert_rules CASCADE;

-- Step 4: Now we can safely drop the columns
ALTER TABLE alert_rules DROP COLUMN IF EXISTS min_nights;
ALTER TABLE alert_rules DROP COLUMN IF EXISTS max_nights;

-- Step 5: Recreate the view without the min_nights and max_nights columns
-- (We'll need to modify the original view definition)
CREATE VIEW api.v1_alert_rules AS
SELECT 
    id,
    user_id,
    name,
    mode,
    spot_id,
    regions,
    origin_iata,
    dest_iata,
    wave_min_m,
    wind_max_kmh,
    -- min_nights,  -- REMOVED
    -- max_nights,  -- REMOVED
    max_price_eur,
    forecast_window,
    days_mask,
    date_from,
    date_to,
    cooldown_hours,
    is_active,
    paused_until,
    expires_at,
    created_at,
    updated_at,
    destination_iata,
    wave_max_m,
    depart_date,
    return_date,
    price_max_usd,
    last_checked_at,
    last_notified_at,
    planning_logic
FROM alert_rules;

-- Step 6: Grant permissions on the recreated view
GRANT SELECT ON api.v1_alert_rules TO anon;
GRANT SELECT ON api.v1_alert_rules TO authenticated;

-- Step 7: Verify the view works
SELECT COUNT(*) FROM api.v1_alert_rules;
