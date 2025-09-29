-- Make alert eligible for worker processing
-- This resets the alert to be processed again by the worker

UPDATE alert_rules 
SET 
    last_checked_at = NULL,
    paused_until = NULL
WHERE id = '9f04e02d-4626-4826-8fba-92931c44de47';

-- Verify the update
SELECT 
    id,
    name,
    last_checked_at,
    paused_until,
    created_at
FROM alert_rules 
WHERE id = '9f04e02d-4626-4826-8fba-92931c44de47';
