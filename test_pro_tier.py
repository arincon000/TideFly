#!/usr/bin/env python3

import os
import sys
import uuid
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

TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

def main():
    print("🚀 Testing 'pro' tier for unlimited alerts...")
    
    # Clean up any existing test alerts first
    try:
        client.table('alert_rules').delete().eq('user_id', TEST_USER_ID).like('name', 'Test%').execute()
        print("🧹 Cleaned up existing test alerts")
    except Exception as e:
        print(f"⚠️ Could not clean up: {e}")
    
    # Test creating multiple alerts with pro tier
    created_alerts = []
    
    for i in range(1, 10):  # Try up to 10 alerts
        try:
            alert = {
                'id': str(uuid.uuid4()),
                'user_id': TEST_USER_ID,
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
            created_alerts.append(alert['id'])
            print(f"✅ Created alert {i}")
            
        except Exception as e:
            print(f"❌ Failed at alert {i}: {e}")
            break
    
    print(f"\n📊 Successfully created {len(created_alerts)} alerts with 'pro' tier")
    
    # Check final count
    try:
        alerts_result = client.table('alert_rules').select('id,is_active').eq('user_id', TEST_USER_ID).execute()
        active_count = len([a for a in alerts_result.data if a['is_active']])
        total_count = len(alerts_result.data)
        print(f"📊 Final counts:")
        print(f"   Active: {active_count}")
        print(f"   Total: {total_count}")
        
        if len(created_alerts) > 1:
            print("🎉 SUCCESS! 'pro' tier allows multiple alerts!")
            return True
        else:
            print("❌ 'pro' tier still has limits")
            return False
            
    except Exception as e:
        print(f"❌ Could not get final count: {e}")
        return False
    
    # Clean up all test alerts
    try:
        for alert_id in created_alerts:
            client.table('alert_rules').delete().eq('id', alert_id).execute()
        print("🧹 Cleaned up all test alerts")
    except Exception as e:
        print(f"⚠️ Could not clean up: {e}")

if __name__ == "__main__":
    main()
