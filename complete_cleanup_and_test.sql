-- Complete cleanup and test script
-- This will safely remove min_nights/max_nights columns and verify everything works

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

-- Step 5: If no dependencies found, remove the columns
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

-- Step 7: Test existing alerts still work
SELECT '=== EXISTING ALERTS AFTER CLEANUP ===' as info;
SELECT 
    id,
    name,
    spot_id,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    forecast_window,
    is_active,
    created_at
FROM alert_rules 
WHERE is_active = true
ORDER BY created_at DESC;

-- Step 8: Test API view access
SELECT '=== TESTING API VIEW ACCESS ===' as info;
SELECT 
    id,
    name,
    spot_id,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    forecast_window,
    is_active
FROM api.v1_alert_rules 
WHERE is_active = true
LIMIT 5;

-- Step 9: Final verification - no broken dependencies
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
