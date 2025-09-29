-- Safer approach: Modify alert parameters to bypass deduplication
-- This changes the alert slightly so it generates a different summary hash

UPDATE alert_rules 
SET 
    wind_max_kmh = wind_max_kmh + 1,  -- Add 1 to wind limit
    last_checked_at = NULL,           -- Reset to make it eligible
    paused_until = NULL               -- Ensure it's not paused
WHERE id = '9f04e02d-4626-4826-8fba-92931c44de47';

-- Verify the update
SELECT 
    id,
    name,
    wind_max_kmh,
    last_checked_at,
    paused_until
FROM alert_rules 
WHERE id = '9f04e02d-4626-4826-8fba-92931c44de47';
