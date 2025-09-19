-- Safe test setup that doesn't drop columns
-- This version works with the existing schema

-- Clean up existing test data
DELETE FROM alert_events WHERE rule_id IN (
    SELECT id FROM alert_rules WHERE name LIKE 'Test Alert%'
);

DELETE FROM alert_rules WHERE name LIKE 'Test Alert%';

DELETE FROM price_cache WHERE spot_id = '15bbdb3e-504a-4c50-8d34-6450104c22b3';

-- Create test alerts using the existing schema (including min_nights and max_nights)
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
    min_nights,        -- Keep existing column
    max_nights,        -- Keep existing column
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
    2,      -- min_nights (keep existing)
    14,     -- max_nights (keep existing)
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
    2,      -- min_nights
    14,     -- max_nights
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
    2,      -- min_nights
    14,     -- max_nights
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
    2,      -- min_nights
    14,     -- max_nights
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
    2,      -- min_nights
    14,     -- max_nights
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
    min_nights,
    max_nights,
    created_at
FROM alert_rules 
WHERE name LIKE 'Test Alert%'
ORDER BY name;
