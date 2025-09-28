#!/usr/bin/env python3

import os
import sys
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

# Check what tier limits exist
print("🔍 Checking tier limits...")

# Check if there are any tier limit tables or functions
try:
    # Look for tier-related tables
    tables = ['tier_limits', 'plan_limits', 'user_limits', 'subscription_limits']
    for table in tables:
        try:
            result = client.table(table).select('*').limit(5).execute()
            print(f"📊 {table}: {len(result.data)} records")
            if result.data:
                print(f"   Sample: {result.data[0]}")
        except Exception as e:
            print(f"❌ {table}: {e}")
except Exception as e:
    print(f"Could not check tier tables: {e}")

# Check current user's tier and limits
TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

try:
    user_result = client.table('users').select('*').eq('id', TEST_USER_ID).execute()
    if user_result.data:
        user = user_result.data[0]
        print(f"\n👤 Test user tier: {user.get('plan_tier', 'None')}")
        print(f"   Expires: {user.get('plan_expires_at', 'None')}")
    else:
        print("❌ Test user not found")
except Exception as e:
    print(f"❌ Could not get user info: {e}")

# Try to find where the tier limits are enforced
print("\n🔍 Looking for tier limit enforcement...")

# Check if there are any database functions that enforce limits
try:
    # Try to get database functions
    functions_result = client.rpc('get_functions').execute()
    print("Database functions:", functions_result)
except Exception as e:
    print(f"Could not get functions: {e}")

# Check if there are any constraints on alert_rules table
try:
    # Try to insert a test alert to see what error we get
    test_alert = {
        'id': 'test-limit-check',
        'user_id': TEST_USER_ID,
        'name': 'Test Limit Check',
        'mode': 'spot',
        'spot_id': '15bbdb3e-504a-4c50-8d34-6450104c22b3',
        'origin_iata': 'LIS',
        'dest_iata': 'BIQ',
        'wave_min_m': 1.0,
        'wave_max_m': 2.0,
        'wind_max_kmh': 20,
        'forecast_window': 5,
        'max_price_eur': 500,
        'planning_logic': 'conservative',
        'days_mask': 127,
        'is_active': True,
        'cooldown_hours': 6
    }
    
    result = client.table('alert_rules').insert(test_alert).execute()
    print("✅ Test alert inserted successfully")
    
    # Clean up
    client.table('alert_rules').delete().eq('id', 'test-limit-check').execute()
    print("🧹 Test alert cleaned up")
    
except Exception as e:
    print(f"❌ Error inserting test alert: {e}")
    # This will tell us exactly what the limit is
