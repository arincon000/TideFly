-- TideFly spots schema migration: switch to skill ranges and enrich columns

-- 1) Add new columns if they don't already exist
ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS skill_level_min TEXT,
  ADD COLUMN IF NOT EXISTS skill_level_max TEXT,
  ADD COLUMN IF NOT EXISTS nearest TEXT,
  ADD COLUMN IF NOT EXISTS hotellook_city_id INTEGER;

-- 2) Backfill min/max from existing difficulty or legacy skill_level
--    Mapping rules:
--      Advanced/Expert         -> advanced / advanced
--      Beginner/Intermediate   -> beginner / intermediate
--      Intermediate/Advanced   -> intermediate / advanced
--      Advanced                -> advanced / advanced
--      Intermediate            -> intermediate / intermediate
--      All levels              -> beginner / intermediate
--    Fallback: legacy skill_level copied to both min/max

UPDATE spots SET
  skill_level_min = COALESCE(
    CASE
      WHEN difficulty ILIKE 'Beginner/Intermediate' THEN 'beginner'
      WHEN difficulty ILIKE 'Intermediate/Advanced' THEN 'intermediate'
      WHEN difficulty ILIKE 'Advanced/Expert' THEN 'advanced'
      WHEN difficulty ILIKE 'Advanced' THEN 'advanced'
      WHEN difficulty ILIKE 'Intermediate' THEN 'intermediate'
      WHEN difficulty ILIKE 'All levels' THEN 'beginner'
      ELSE NULL
    END,
    CASE skill_level
      WHEN 'beginner' THEN 'beginner'
      WHEN 'intermediate' THEN 'intermediate'
      WHEN 'advanced' THEN 'advanced'
      ELSE skill_level_min
    END
  ),
  skill_level_max = COALESCE(
    CASE
      WHEN difficulty ILIKE 'Beginner/Intermediate' THEN 'intermediate'
      WHEN difficulty ILIKE 'Intermediate/Advanced' THEN 'advanced'
      WHEN difficulty ILIKE 'Advanced/Expert' THEN 'advanced'
      WHEN difficulty ILIKE 'Advanced' THEN 'advanced'
      WHEN difficulty ILIKE 'Intermediate' THEN 'intermediate'
      WHEN difficulty ILIKE 'All levels' THEN 'intermediate'
      ELSE NULL
    END,
    CASE skill_level
      WHEN 'beginner' THEN 'beginner'
      WHEN 'intermediate' THEN 'intermediate'
      WHEN 'advanced' THEN 'advanced'
      ELSE skill_level_max
    END
  );

-- 3) Optional checks: constrain allowed values (skip if you prefer open text)
-- COMMENT these in if you want hard enums enforced:
-- ALTER TABLE spots
--   ADD CONSTRAINT chk_skill_level_min CHECK (skill_level_min IN ('beginner','intermediate','advanced')),
--   ADD CONSTRAINT chk_skill_level_max CHECK (skill_level_max IN ('beginner','intermediate','advanced'));

-- 4) Drop legacy difficulty column
ALTER TABLE spots DROP COLUMN IF EXISTS difficulty;

-- 5) Useful indexes for wizard filtering
CREATE INDEX IF NOT EXISTS idx_spots_region_major ON spots(region_major);
CREATE INDEX IF NOT EXISTS idx_spots_country ON spots(country);
CREATE INDEX IF NOT EXISTS idx_spots_skill_range ON spots(skill_level_min, skill_level_max);

-- Done.



