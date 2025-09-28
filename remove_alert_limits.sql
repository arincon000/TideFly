-- Remove alert limits for comprehensive testing
-- This will allow us to create 108 test alerts

-- Check current limits
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
AND column_name IN ('max_active_alerts', 'max_total_alerts', 'tier_limits');

-- Remove any tier-based limits (if they exist)
-- We'll need to check what constraints exist first
