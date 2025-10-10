-- Safe audit to understand dependencies before cleanup
-- This will help us clean up without breaking anything

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

-- 3. Check what constraints reference these columns
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

-- 4. Check what indexes reference these columns
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'alert_rules' 
    AND (indexdef LIKE '%min_nights%' OR indexdef LIKE '%max_nights%');

-- 5. Check if there are any RLS policies that reference these columns
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

-- 6. Check current data in these columns
SELECT 
    COUNT(*) as total_alerts,
    COUNT(min_nights) as alerts_with_min_nights,
    COUNT(max_nights) as alerts_with_max_nights,
    MIN(min_nights) as min_nights_value,
    MAX(min_nights) as max_nights_value
FROM alert_rules;


