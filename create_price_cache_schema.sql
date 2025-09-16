-- Create price cache table for storing flight prices and affiliate links
CREATE TABLE IF NOT EXISTS public.price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id UUID NOT NULL REFERENCES public.spots(id),
  origin_iata TEXT NOT NULL,
  dest_iata TEXT NOT NULL,
  price_eur DECIMAL(10,2),
  affiliate_link TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_price_cache_spot_id ON public.price_cache(spot_id);
CREATE INDEX IF NOT EXISTS idx_price_cache_origin_dest ON public.price_cache(origin_iata, dest_iata);
CREATE INDEX IF NOT EXISTS idx_price_cache_cached_at ON public.price_cache(cached_at);
CREATE INDEX IF NOT EXISTS idx_price_cache_expires_at ON public.price_cache(expires_at);

-- Enable RLS
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "price_cache public read" 
ON public.price_cache FOR SELECT 
TO anon, authenticated 
USING (true);

-- Create policy for service role write access
CREATE POLICY "price_cache service write" 
ON public.price_cache FOR ALL 
TO service_role 
USING (true);

-- Add comment to document the table
COMMENT ON TABLE public.price_cache IS 'Cache for flight prices and affiliate links to optimize revenue capture';
COMMENT ON COLUMN public.price_cache.price_eur IS 'Flight price in EUR';
COMMENT ON COLUMN public.price_cache.affiliate_link IS 'Affiliate link for revenue tracking';
COMMENT ON COLUMN public.price_cache.expires_at IS 'When this price data expires (default 24 hours)';
