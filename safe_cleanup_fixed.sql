-- Fixed safe cleanup script without array_agg errors
-- This will safely remove min_nights and max_nights columns

-- Step 1: Check current structure
SELECT 'Current alert_rules structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
    AND column_name IN ('min_nights', 'max_nights')
ORDER BY ordinal_position;

-- Step 2: Check if there are any views that depend on these columns
SELECT 'Views that depend on min_nights/max_nights:' as info;
SELECT schemaname, viewname
FROM pg_views 
WHERE definition LIKE '%min_nights%' OR definition LIKE '%max_nights%';

-- Step 3: Check current data in these columns
SELECT 'Current data in min_nights/max_nights:' as info;
SELECT 
    COUNT(*) as total_alerts,
    COUNT(min_nights) as alerts_with_min_nights,
    COUNT(max_nights) as alerts_with_max_nights
FROM alert_rules;

-- Step 4: Show sample data
SELECT 'Sample data from existing alerts:' as info;
SELECT 
    id,
    name,
    min_nights,
    max_nights,
    wave_min_m,
    wave_max_m,
    wind_max_kmh
FROM alert_rules 
WHERE is_active = true
LIMIT 5;

-- Step 5: Remove the columns safely
DO $$
BEGIN
    -- Try to remove min_nights column
    BEGIN
        ALTER TABLE alert_rules DROP COLUMN IF EXISTS min_nights;
        RAISE NOTICE 'Successfully removed min_nights column';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not remove min_nights column: %', SQLERRM;
    END;
    
    -- Try to remove max_nights column
    BEGIN
        ALTER TABLE alert_rules DROP COLUMN IF EXISTS max_nights;
        RAISE NOTICE 'Successfully removed max_nights column';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not remove max_nights column: %', SQLERRM;
    END;
END $$;

-- Step 6: Verify the cleanup
SELECT 'After cleanup - remaining columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 7: Test that existing alerts still work
SELECT 'Testing existing alerts after cleanup:' as info;
SELECT 
    id,
    name,
    spot_id,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    forecast_window,
    is_active
FROM alert_rules 
WHERE is_active = true
ORDER BY created_at DESC;
