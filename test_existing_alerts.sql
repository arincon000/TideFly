-- Test existing alerts before and after cleanup
-- This ensures we don't break anything

-- Step 1: Check current alerts
SELECT 'Current alerts in the system:' as info;
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

-- Step 2: Check if alerts have the problematic columns
SELECT 'Alerts with min_nights/max_nights data:' as info;
SELECT 
    id,
    name,
    min_nights,
    max_nights
FROM alert_rules 
WHERE min_nights IS NOT NULL OR max_nights IS NOT NULL;

-- Step 3: Test the API view (this is what the frontend uses)
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

-- Step 4: Check if there are any alert events
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

