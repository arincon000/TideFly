#!/usr/bin/env python3
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('vercel-app/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Check spots table
result = supabase.table('spots').select('id,name').execute()
print('Available spots:')
for row in result.data:
    print(f'  {row["id"]}: {row["name"]}')

print('\nForecast cache spot IDs:')
result2 = supabase.table('forecast_cache').select('spot_id').execute()
spot_ids = set()
for row in result2.data:
    spot_ids.add(row['spot_id'])
for spot_id in spot_ids:
    print(f'  {spot_id}')