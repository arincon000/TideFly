#!/usr/bin/env python3
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('vercel-app/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Check all forecast cache entries
result = supabase.table('forecast_cache').select('*').order('cached_at', desc=True).limit(10).execute()
print('All forecast cache entries:')
for row in result.data:
    print(f'  Spot: {row["spot_id"]}, Date: {row["date"]}, Cached: {row["cached_at"]}')

print('\nForecast cache for Biarritz spot:')
result2 = supabase.table('forecast_cache').select('*').eq('spot_id', '15bbdb3e-504a-4c50-8d34-6450104c22b3').order('cached_at', desc=True).limit(5).execute()
for row in result2.data:
    print(f'  Date: {row["date"]}, Cached: {row["cached_at"]}, Morning OK: {row["morning_ok"]}')
    print(f'    Wave: {row["wave_stats"]}')
    print(f'    Wind: {row["wind_stats"]}')
    print()

# Check alert rules
result3 = supabase.table('alert_rules').select('id,name,spot_id,last_checked_at').limit(5).execute()
print('Alert rules:')
for row in result3.data:
    print(f'  {row["id"]}: {row["name"]} - Spot: {row["spot_id"]} - Last checked: {row["last_checked_at"]}')
