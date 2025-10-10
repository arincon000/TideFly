-- Fixed audit script for min_nights and max_nights dependencies
-- This will help us understand the impact before dropping them

-- 1. Check what views depend on these columns
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%';

-- 2. Check what functions/procedures reference these columns
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%min_nights%' 
   OR pg_get_functiondef(p.oid) LIKE '%max_nights%';

-- 3. Check what triggers reference these columns
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    n.nspname as schema_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.tgname LIKE '%min_nights%' OR t.tgname LIKE '%max_nights%';

-- 4. Check what constraints reference these columns
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE kcu.column_name IN ('min_nights', 'max_nights')
    AND tc.table_name = 'alert_rules';

-- 5. Check what indexes reference these columns
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'alert_rules' 
    AND (indexdef LIKE '%min_nights%' OR indexdef LIKE '%max_nights%');

-- 6. Check the specific view that's causing the error
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'v1_alert_rules' AND schemaname = 'api';

-- 7. Check if there are any RLS policies that reference these columns
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'alert_rules' 
    AND (qual LIKE '%min_nights%' OR qual LIKE '%max_nights%' 
         OR with_check LIKE '%min_nights%' OR with_check LIKE '%max_nights%');


