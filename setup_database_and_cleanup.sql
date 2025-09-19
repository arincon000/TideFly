-- =====================================================
-- TideFly Database Setup and Cleanup Script
-- =====================================================

-- 1. Add missing columns to alert_rules table
ALTER TABLE public.alert_rules 
ADD COLUMN IF NOT EXISTS planning_logic TEXT DEFAULT 'conservative' 
CHECK (planning_logic IN ('conservative', 'optimistic', 'aggressive'));

-- Add comment to document the column
COMMENT ON COLUMN public.alert_rules.planning_logic IS 'Planning logic for forecast evaluation: conservative (avg wave + max wind), optimistic (avg wave + avg wind), aggressive (min wave + avg wind)';

-- 2. Create price_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.price_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    spot_id UUID NOT NULL,
    origin_iata TEXT NOT NULL,
    dest_iata TEXT NOT NULL,
    price_eur DECIMAL(10,2) NOT NULL,
    affiliate_link TEXT,
    hotel_link TEXT,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add hotel_link column if it doesn't exist
ALTER TABLE public.price_cache 
ADD COLUMN IF NOT EXISTS hotel_link TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.price_cache.hotel_link IS 'Hotel booking affiliate link for revenue tracking';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_cache_spot_id ON public.price_cache(spot_id);
CREATE INDEX IF NOT EXISTS idx_price_cache_expires_at ON public.price_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON public.alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active ON public.alert_rules(is_active);

-- 4. Enable RLS on price_cache
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy for price_cache (users can read their own data via alert_rules)
CREATE POLICY IF NOT EXISTS "price_cache read own via rules"
ON public.price_cache FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.alert_rules r
    WHERE r.spot_id = price_cache.spot_id
      AND r.user_id = auth.uid()
  )
);

-- 6. Clean up all existing alerts and related data
-- Delete alert events first (foreign key constraint)
DELETE FROM public.alert_events;

-- Delete price cache entries
DELETE FROM public.price_cache;

-- Delete all alert rules
DELETE FROM public.alert_rules;

-- 7. Clean up forecast cache (optional - keep for testing)
-- DELETE FROM public.forecast_cache;

-- 8. Reset sequences if any
-- (PostgreSQL will handle this automatically for UUID columns)

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_events TO authenticated;

-- 10. Verify setup
SELECT 'Database setup completed successfully' as status;
