-- Simple audit to find what depends on min_nights and max_nights

-- 1. Check the specific view that's causing the error
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'v1_alert_rules' AND schemaname = 'api';

-- 2. Check if there are any other views that reference these columns
SELECT 
    schemaname,
    viewname
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%';

-- 3. Check what columns exist in alert_rules table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

