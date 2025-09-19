-- Cleanup script that handles the api.v1_alert_rules view dependency
-- This will safely remove min_nights and max_nights columns

-- Step 1: Check current structure
SELECT '=== CURRENT TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
    AND column_name IN ('min_nights', 'max_nights')
ORDER BY ordinal_position;

-- Step 2: Check the view that depends on these columns
SELECT '=== VIEW THAT DEPENDS ON MIN_NIGHTS/MAX_NIGHTS ===' as info;
SELECT schemaname, viewname, definition
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%';

-- Step 3: Check current data in these columns
SELECT '=== CURRENT DATA IN MIN_NIGHTS/MAX_NIGHTS ===' as info;
SELECT 
    COUNT(*) as total_alerts,
    COUNT(min_nights) as alerts_with_min_nights,
    COUNT(max_nights) as alerts_with_max_nights
FROM alert_rules;

-- Step 4: Drop and recreate the view without the problematic columns
SELECT '=== RECREATING VIEW WITHOUT MIN_NIGHTS/MAX_NIGHTS ===' as info;

-- First, drop the existing view
DROP VIEW IF EXISTS api.v1_alert_rules;

-- Recreate the view without min_nights and max_nights columns
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
FROM public.alert_rules;

-- Step 5: Now safely remove the columns
SELECT '=== REMOVING MIN_NIGHTS/MAX_NIGHTS COLUMNS ===' as info;
ALTER TABLE alert_rules DROP COLUMN IF EXISTS min_nights;
ALTER TABLE alert_rules DROP COLUMN IF EXISTS max_nights;

-- Step 6: Verify the cleanup worked
SELECT '=== FINAL TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 7: Test that the view still works
SELECT '=== TESTING VIEW ACCESS ===' as info;
SELECT COUNT(*) as total_alerts_in_view
FROM api.v1_alert_rules;

-- Step 8: Test that the table still works
SELECT '=== TESTING TABLE ACCESS ===' as info;
SELECT COUNT(*) as total_alerts_in_table
FROM alert_rules;

-- Step 9: Final verification - no broken dependencies
SELECT '=== FINAL VERIFICATION ===' as info;
SELECT 'Views that still reference min_nights/max_nights:' as check_type, schemaname, viewname
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%';
