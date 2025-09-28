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

# Check current alert rules
result = client.table('alert_rules').select('*').limit(5).execute()
print(f"Current alerts: {len(result.data)}")

# Check if there are any constraints or limits
try:
    # Try to get table info
    info_result = client.rpc('get_table_info', {'table_name': 'alert_rules'}).execute()
    print("Table info:", info_result)
except Exception as e:
    print(f"Could not get table info: {e}")

# Check for any tier-related limits
try:
    tier_result = client.table('user_tiers').select('*').execute()
    print(f"User tiers: {len(tier_result.data)}")
    for tier in tier_result.data:
        print(f"Tier: {tier}")
except Exception as e:
    print(f"Could not get tier info: {e}")

# Check current user's alert count
user_id = '00000000-0000-0000-0000-000000000000'  # Test user
user_alerts = client.table('alert_rules').select('id,is_active').eq('user_id', user_id).execute()
active_count = len([a for a in user_alerts.data if a['is_active']])
total_count = len(user_alerts.data)

print(f"User {user_id}:")
print(f"  Active alerts: {active_count}")
print(f"  Total alerts: {total_count}")
