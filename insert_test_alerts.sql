ITimage.png-- Insert 5 test alerts for comprehensive testing
-- Run this in Supabase SQL Editor

-- 1. 🏄‍♂️ Biarritz Perfect Waves (Expected: HIT)
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
    forecast_window,
    max_price_eur,
    planning_logic,
    days_mask,
    is_active,
    cooldown_hours,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000', -- Test user ID
    '🏄‍♂️ Biarritz Perfect Waves',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3', -- Biarritz spot
    'LIS', -- Lisbon
    'BIQ', -- Biarritz
    1.5,   -- Wave min
    2.5,   -- Wave max
    15,    -- Wind max
    5,     -- Forecast window
    300,   -- Max price
    'conservative',
    127,   -- All days
    true,
    6,
    NOW(),
    NOW()
);

-- 2. 🌊 Ericeira Big Waves (Expected: NO HIT)
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
    forecast_window,
    max_price_eur,
    planning_logic,
    days_mask,
    is_active,
    cooldown_hours,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    '🌊 Ericeira Big Waves',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'MAD', -- Madrid
    'LIS', -- Lisbon
    2.0,   -- Wave min (high)
    4.0,   -- Wave max (very high)
    20,    -- Wind max
    10,    -- Forecast window
    250,   -- Max price
    'aggressive',
    127,
    true,
    6,
    NOW(),
    NOW()
);

-- 3. 🏖️ Beginner Friendly (Expected: HIT)
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
    forecast_window,
    max_price_eur,
    planning_logic,
    days_mask,
    is_active,
    cooldown_hours,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    '🏖️ Beginner Friendly',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'BCN', -- Barcelona
    'BIQ', -- Biarritz
    0.5,   -- Wave min (very low)
    1.5,   -- Wave max (low)
    10,    -- Wind max (low)
    16,    -- Forecast window (max)
    400,   -- Max price
    'optimistic',
    127,
    true,
    6,
    NOW(),
    NOW()
);

-- 4. 💨 Windy Conditions (Expected: NO HIT)
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
    forecast_window,
    max_price_eur,
    planning_logic,
    days_mask,
    is_active,
    cooldown_hours,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    '💨 Windy Conditions',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'MAD', -- Madrid
    'BIQ', -- Biarritz
    1.0,   -- Wave min
    2.0,   -- Wave max
    5,     -- Wind max (very strict)
    5,     -- Forecast window
    200,   -- Max price
    'conservative',
    127,
    true,
    6,
    NOW(),
    NOW()
);

-- 5. 💰 Budget Trip (Expected: NO HIT)
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
    forecast_window,
    max_price_eur,
    planning_logic,
    days_mask,
    is_active,
    cooldown_hours,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    '💰 Budget Trip',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'OPO', -- Porto
    'BIQ', -- Biarritz
    1.2,   -- Wave min
    2.0,   -- Wave max
    18,    -- Wind max
    5,     -- Forecast window
    50,    -- Max price (very low)
    'conservative',
    127,
    true,
    6,
    NOW(),
    NOW()
);

-- Verify the alerts were created
SELECT 
    id,
    name,
    origin_iata,
    dest_iata,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    forecast_window,
    max_price_eur,
    planning_logic,
    created_at
FROM alert_rules 
WHERE name LIKE '%🏄‍♂️%' 
   OR name LIKE '%🌊%' 
   OR name LIKE '%🏖️%' 
   OR name LIKE '%💨%' 
   OR name LIKE '%💰%'
ORDER BY created_at DESC;

