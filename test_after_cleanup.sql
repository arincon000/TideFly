-- Test script to verify everything works after cleanup
-- Run this after the safe_cleanup_fixed.sql

-- Step 1: Verify table structure
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Test existing alerts
SELECT 'Existing alerts:' as info;
SELECT 
    id,
    name,
    spot_id,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    forecast_window,
    is_active,
    created_at
FROM alert_rules 
WHERE is_active = true
ORDER BY created_at DESC;

-- Step 3: Test API view access (this is what the frontend uses)
SELECT 'Testing API view access:' as info;
SELECT 
    id,
    name,
    spot_id,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    forecast_window,
    is_active
FROM api.v1_alert_rules 
WHERE is_active = true
LIMIT 5;

-- Step 4: Check recent alert events
SELECT 'Recent alert events:' as info;
SELECT 
    rule_id,
    status,
    reason,
    sent_at,
    tier
FROM alert_events 
ORDER BY sent_at DESC 
LIMIT 10;

-- Step 5: Verify no broken dependencies
SELECT 'Checking for any remaining references to min_nights/max_nights:' as info;
SELECT 'Views:' as check_type, schemaname, viewname
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%'
UNION ALL
SELECT 'Functions:' as check_type, n.nspname as schemaname, p.proname as viewname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%min_nights%' 
   OR pg_get_functiondef(p.oid) LIKE '%max_nights%';

