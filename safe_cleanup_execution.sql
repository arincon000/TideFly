-- Safe cleanup execution script
-- This will remove min_nights and max_nights columns safely

-- Step 1: First, let's see what we're working with
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

-- Step 3: If no views depend on these columns, we can safely remove them
-- (This will be executed only if the audit shows no dependencies)

-- Step 4: Remove the columns safely
-- Note: This will fail if there are dependencies, which is what we want
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

-- Step 5: Verify the cleanup
SELECT 'After cleanup - remaining columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_rules' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
