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

def main():
    print("🔍 Checking unlimited tier limits...")
    
    # Check if there are tier limits in the database
    try:
        # Look for tier_limits table
        tier_limits_result = client.table('tier_limits').select('*').eq('tier_name', 'unlimited').execute()
        if tier_limits_result.data:
            print(f"📊 Unlimited tier limits: {tier_limits_result.data[0]}")
        else:
            print("❌ No tier_limits table or unlimited tier not found")
    except Exception as e:
        print(f"❌ Could not check tier_limits: {e}")
    
    # Check what the current limits are by trying to create a test alert
    print("\n🧪 Testing alert creation limits...")
    
    # First, let's clean up existing alerts
    try:
        client.table('alert_rules').delete().eq('user_id', '00000000-0000-0000-0000-000000000000').execute()
        print("🧹 Cleaned up existing alerts")
    except Exception as e:
        print(f"⚠️ Could not clean up: {e}")
    
    # Try to create alerts one by one to see where the limit is
    import uuid
    created_count = 0
    
    for i in range(1, 20):  # Try up to 20 alerts
        try:
            alert = {
                'id': str(uuid.uuid4()),
                'user_id': '00000000-0000-0000-0000-000000000000',
                'name': f'Test Alert {i}',
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
            
            result = client.table('alert_rules').insert(alert).execute()
            created_count += 1
            print(f"✅ Created alert {i}")
            
        except Exception as e:
            print(f"❌ Failed at alert {i}: {e}")
            break
    
    print(f"\n📊 Successfully created {created_count} alerts")
    
    # Check final count
    try:
        alerts_result = client.table('alert_rules').select('id,is_active').eq('user_id', '00000000-0000-0000-0000-000000000000').execute()
        active_count = len([a for a in alerts_result.data if a['is_active']])
        total_count = len(alerts_result.data)
        print(f"📊 Final counts:")
        print(f"   Active: {active_count}")
        print(f"   Total: {total_count}")
    except Exception as e:
        print(f"❌ Could not get final count: {e}")

if __name__ == "__main__":
    main()
