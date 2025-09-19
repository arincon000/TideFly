-- Final cleanup script for min_nights and max_nights columns
-- Run this in Supabase SQL editor

-- Step 1: Check current structure
SELECT '=== CURRENT TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
    AND column_name IN ('min_nights', 'max_nights')
ORDER BY ordinal_position;

-- Step 2: Check current data in these columns
SELECT '=== CURRENT DATA IN MIN_NIGHTS/MAX_NIGHTS ===' as info;
SELECT 
    COUNT(*) as total_alerts,
    COUNT(min_nights) as alerts_with_min_nights,
    COUNT(max_nights) as alerts_with_max_nights
FROM alert_rules;

-- Step 3: Check if there are any views that depend on these columns
SELECT '=== VIEWS THAT DEPEND ON MIN_NIGHTS/MAX_NIGHTS ===' as info;
SELECT schemaname, viewname
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%';

-- Step 4: Check if there are any functions that depend on these columns
SELECT '=== FUNCTIONS THAT DEPEND ON MIN_NIGHTS/MAX_NIGHTS ===' as info;
SELECT 
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%min_nights%' 
   OR pg_get_functiondef(p.oid) LIKE '%max_nights%';

-- Step 5: Remove the columns (only if no dependencies found)
-- This will only execute if the above queries return no results
DO $$
BEGIN
    -- Check if any views depend on these columns
    IF EXISTS (
        SELECT 1 FROM pg_views 
        WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%'
    ) THEN
        RAISE NOTICE 'Cannot remove columns: Views depend on them';
    ELSE
        -- Check if any functions depend on these columns
        IF EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE pg_get_functiondef(p.oid) LIKE '%min_nights%' 
               OR pg_get_functiondef(p.oid) LIKE '%max_nights%'
        ) THEN
            RAISE NOTICE 'Cannot remove columns: Functions depend on them';
        ELSE
            -- Safe to remove columns
            RAISE NOTICE 'Removing min_nights column...';
            ALTER TABLE alert_rules DROP COLUMN IF EXISTS min_nights;
            
            RAISE NOTICE 'Removing max_nights column...';
            ALTER TABLE alert_rules DROP COLUMN IF EXISTS max_nights;
            
            RAISE NOTICE 'Columns removed successfully!';
        END IF;
    END IF;
END $$;

-- Step 6: Verify the cleanup worked
SELECT '=== FINAL TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 7: Test that the table still works
SELECT '=== TESTING TABLE ACCESS ===' as info;
SELECT COUNT(*) as total_alerts
FROM alert_rules;

-- Step 8: Final verification - no broken dependencies
SELECT '=== FINAL VERIFICATION - NO BROKEN DEPENDENCIES ===' as info;
SELECT 'Views:' as check_type, schemaname, viewname
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%'
UNION ALL
SELECT 'Functions:' as check_type, n.nspname as schemaname, p.proname as viewname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%min_nights%' 
   OR pg_get_functiondef(p.oid) LIKE '%max_nights%';
