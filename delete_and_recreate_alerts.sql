-- Delete existing test alerts
DELETE FROM alert_rules 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Insert new test alerts with explicit planning logic
-- 1. 🏄‍♂️ Biarritz Perfect Waves (5-day, Conservative)
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
    '🏄‍♂️ Biarritz Perfect Waves (5-day)',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'LIS',
    'BIQ',
    1.5,
    2.5,
    15,
    5,
    300,
    'conservative',
    127,
    true,
    6,
    NOW(),
    NOW()
);

-- 2. 🌊 Ericeira Big Waves (10-day, Aggressive)
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
    '🌊 Ericeira Big Waves (10-day)',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'MAD',
    'LIS',
    2.0,
    4.0,
    20,
    10,
    250,
    'aggressive',
    127,
    true,
    6,
    NOW(),
    NOW()
);

-- 3. 🏖️ Beginner Friendly (16-day, Optimistic)
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
    '🏖️ Beginner Friendly (16-day)',
    'spot',
    '15bbdb3e-504a-4c50-8d34-6450104c22b3',
    'BCN',
    'BIQ',
    0.5,
    1.5,
    10,
    16,
    400,
    'optimistic',
    127,
    true,
    6,
    NOW(),
    NOW()
);

-- Verify the alerts were created with correct planning logic
SELECT 
    id,
    name,
    forecast_window,
    planning_logic,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    created_at
FROM alert_rules 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC;
