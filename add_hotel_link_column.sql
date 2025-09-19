-- Add hotel_link column to price_cache table
ALTER TABLE public.price_cache 
ADD COLUMN IF NOT EXISTS hotel_link TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.price_cache.hotel_link IS 'Hotel booking affiliate link for revenue tracking';

