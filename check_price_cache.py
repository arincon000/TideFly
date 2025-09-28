import os
import sys
from datetime import datetime, timedelta
import pytz
import json

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append('vercel-app')

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('vercel-app/.env.local')

# Create Supabase client
client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

print("Checking price cache data...")

# Check price cache for LIS->BIQ
try:
    result = client.table('price_cache').select('*').eq('origin_iata', 'LIS').eq('dest_iata', 'BIQ').execute()
    
    if result.data:
        print(f"Found {len(result.data)} price cache entries for LIS->BIQ:")
        for entry in result.data:
            print(f"  - Date: {entry.get('date')}")
            print(f"    Price: {entry.get('price')}")
            print(f"    Cached at: {entry.get('cached_at')}")
            print(f"    Fresh: {entry.get('fresh')}")
            print()
    else:
        print("No price cache entries found for LIS->BIQ")
        
except Exception as e:
    print(f"Error checking price cache: {e}")

print("\nChecking forecast cache data...")

# Check forecast cache
try:
    result = client.table('forecast_cache').select('*').eq('spot_id', '15bbdb3e-504a-4c50-8d34-6450104c22b3').execute()
    
    if result.data:
        print(f"Found {len(result.data)} forecast cache entries for Biarritz:")
        for entry in result.data:
            print(f"  - Date: {entry.get('date')}")
            print(f"    Cached at: {entry.get('cached_at')}")
            print(f"    Morning OK: {entry.get('morning_ok')}")
            print()
    else:
        print("No forecast cache entries found for Biarritz")
        
except Exception as e:
    print(f"Error checking forecast cache: {e}")
