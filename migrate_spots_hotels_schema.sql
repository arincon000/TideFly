-- TideFly: migrate spots table away from Hotellook IDs to city-name fields
-- Safe to run multiple times

-- 1) Rename nearest -> nearest_city if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spots' AND column_name = 'nearest'
  ) THEN
    ALTER TABLE public.spots RENAME COLUMN nearest TO nearest_city;
  END IF;
END$$;

-- 2) Add iata_city_name and nearest_city if missing
ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS iata_city_name text,
  ADD COLUMN IF NOT EXISTS nearest_city text;

-- 3) Drop obsolete Hotellook ID columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='spots' AND column_name='hotellook_city_id'
  ) THEN
    ALTER TABLE public.spots DROP COLUMN hotellook_city_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='spots' AND column_name='hotellook_city_id_airport'
  ) THEN
    ALTER TABLE public.spots DROP COLUMN hotellook_city_id_airport;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='spots' AND column_name='hotellook_city_id_near'
  ) THEN
    ALTER TABLE public.spots DROP COLUMN hotellook_city_id_near;
  END IF;
END$$;

-- 4) Optional backfill: if nearest_city is null but nearest existed, handled by rename above.




