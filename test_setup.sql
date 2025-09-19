-- Clean up existing test data
DELETE FROM alert_events WHERE rule_id IN (
    SELECT id FROM alert_rules WHERE name LIKE 'Test Alert%'
);

DELETE FROM alert_rules WHERE name LIKE 'Test Alert%';

DELETE FROM price_cache WHERE spot_id = '15bbdb3e-504a-4c50-8d34-6450104c22b3';

-- Remove unnecessary min_nights and max_nights columns if they exist
-- (This will fail silently if columns don't exist, which is fine)
ALTER TABLE alert_rules DROP COLUMN IF EXISTS min_nights;
ALTER TABLE alert_rules DROP COLUMN IF EXISTS max_nights;

-- Create test alerts using the correct schema
INSERT INTO alert_rules (
    id,
    user_id,
    name, 
    mode,
    spot_id, 
    origin_iata, 
    dest_iata, 
    wave_min_m, 
    wave_max_m, 
    wind_max_kmh, 
    max_price_eur,
    forecast_window, 
    days_mask,
    cooldown_hours,
    is_active,
    created_at,
    updated_at,
    destination_iata,
    planning_logic
) VALUES 
(
    gen_random_uuid(),
    'f239fde5-6dfb-4cc8-8711-7ec51e30d266', -- Use existing user_id
    'Test Alert 1 - Very Likely to Hit',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3', -- BIQ spot
    'LIS',
    'BIQ',
    0.0,    -- Very low minimum
    10.0,   -- Very high maximum
    50.0,   -- Very high wind max
    800,    -- Max price
    5,      -- Forecast window
    127,    -- All days of week (1+2+4+8+16+32+64)
    24,     -- 24 hour cooldown
    true,   -- Active
    NOW(),
    NOW(),
    'BIQ',
    'conservative'
),
(
    gen_random_uuid(),
    'f239fde5-6dfb-4cc8-8711-7ec51e30d266',
    'Test Alert 2 - Unlikely to Hit',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'LIS',
    'BIQ',
    3.0,    -- High minimum
    3.5,    -- Very narrow range
    5.0,    -- Very low wind max
    800,
    5,
    127,
    24,
    true,
    NOW(),
    NOW(),
    'BIQ',
    'conservative'
),
(
    gen_random_uuid(),
    'f239fde5-6dfb-4cc8-8711-7ec51e30d266',
    'Test Alert 3 - Moderate Conditions',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'LIS',
    'BIQ',
    1.0,
    2.5,
    20.0,
    800,
    5,
    127,
    24,
    true,
    NOW(),
    NOW(),
    'BIQ',
    'conservative'
),
(
    gen_random_uuid(),
    'f239fde5-6dfb-4cc8-8711-7ec51e30d266',
    'Test Alert 4 - Optimistic Planning',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'LIS',
    'BIQ',
    0.5,
    2.0,
    15.0,
    800,
    5,
    127,
    24,
    true,
    NOW(),
    NOW(),
    'BIQ',
    'optimistic'
),
(
    gen_random_uuid(),
    'f239fde5-6dfb-4cc8-8711-7ec51e30d266',
    'Test Alert 5 - Edge Case',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'LIS',
    'BIQ',
    1.5,
    2.0,
    12.0,
    800,
    5,
    127,
    24,
    true,
    NOW(),
    NOW(),
    'BIQ',
    'conservative'
);

-- Show the created alerts
SELECT 
    id,
    name,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    planning_logic,
    origin_iata,
    dest_iata,
    created_at
FROM alert_rules 
WHERE name LIKE 'Test Alert%'
ORDER BY name;
