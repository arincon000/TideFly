-- Clear deduplication history for the alert to force a new email
-- This removes all alert_events for the specific rule so the worker will send a fresh email

DELETE FROM alert_events 
WHERE rule_id = '9f04e02d-4626-4826-8fba-92931c44de47';

-- Verify the deletion
SELECT COUNT(*) as remaining_events
FROM alert_events 
WHERE rule_id = '9f04e02d-4626-4826-8fba-92931c44de47';
