-- Import surf spots CSV to Supabase
-- 
-- Usage:
--   1. Upload your CSV file to Supabase Storage or a temporary location
--   2. Run this script in the Supabase SQL Editor
--   3. Replace the file path with your actual file path

-- Step 1: Create a temporary table for import (if needed)
CREATE TEMP TABLE spots_import (
    id TEXT,
    name TEXT,
    country TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    timezone TEXT,
    seasonality TEXT,
    difficulty TEXT,
    primary_airport_iata TEXT,
    region_major TEXT,
    skill_level TEXT,
    orientation TEXT,
    wave_min_m DECIMAL,
    wave_max_m DECIMAL,
    wind_max_kmh DECIMAL,
    season_months TEXT,
    notes TEXT,
    slug TEXT,
    active BOOLEAN,
    source TEXT
);

-- Step 2: Import CSV data
-- Option A: Using COPY (if you have file access)
-- COPY spots_import FROM '/path/to/your/spots_europe_20250104.csv' DELIMITER ',' CSV HEADER;

-- Option B: Manual insert (for small datasets)
-- INSERT INTO spots_import VALUES (...);

-- Option C: Use Supabase Dashboard Import (Recommended)
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to Table Editor → spots
-- 3. Click "Insert" → "Import data from CSV"
-- 4. Upload your CSV file
-- 5. Map columns and import

-- Step 3: Insert into main spots table (with UUID generation)
INSERT INTO spots (
    id,
    name,
    country,
    latitude,
    longitude,
    timezone,
    seasonality,
    difficulty,
    created_at,
    primary_airport_iata,
    region_major,
    skill_level,
    orientation,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    season_months,
    notes,
    slug,
    active
)
SELECT 
    gen_random_uuid(),  -- Generate new UUID for each spot
    name,
    country,
    latitude,
    longitude,
    timezone,
    seasonality,
    difficulty,
    NOW(),  -- created_at
    primary_airport_iata,
    region_major,
    skill_level,
    orientation,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    season_months,
    notes,
    slug,
    active
FROM spots_import
ON CONFLICT (slug) DO NOTHING;  -- Skip duplicates based on slug

-- Step 4: Verify import
SELECT 
    region_major,
    COUNT(*) as spot_count,
    COUNT(DISTINCT primary_airport_iata) as airport_count
FROM spots
GROUP BY region_major
ORDER BY spot_count DESC;

-- Step 5: Quality checks
-- Check for missing critical fields
SELECT 
    COUNT(*) as total_spots,
    COUNT(*) FILTER (WHERE latitude IS NULL) as missing_latitude,
    COUNT(*) FILTER (WHERE longitude IS NULL) as missing_longitude,
    COUNT(*) FILTER (WHERE primary_airport_iata IS NULL) as missing_airport,
    COUNT(*) FILTER (WHERE country IS NULL OR country = 'Unknown') as missing_country
FROM spots;

-- Check OpenMeteo compatibility (sample check)
-- You should validate a few random spots manually with OpenMeteo API

-- Optional: Update existing spots (if re-importing)
-- UPDATE spots SET 
--     seasonality = spots_import.seasonality,
--     difficulty = spots_import.difficulty,
--     wave_min_m = spots_import.wave_min_m,
--     wave_max_m = spots_import.wave_max_m,
--     wind_max_kmh = spots_import.wind_max_kmh
-- FROM spots_import
-- WHERE spots.slug = spots_import.slug;

-- Cleanup
DROP TABLE IF EXISTS spots_import;

-- Success message
SELECT '✅ Import complete! Check the verification queries above.' as status;



