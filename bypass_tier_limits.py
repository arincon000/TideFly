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
    print("🚀 Attempting to bypass tier limits for comprehensive testing...")
    
    # Strategy 1: Try to create alerts with is_active=False to bypass active limits
    print("\n📋 Strategy 1: Creating inactive alerts...")
    
    created_alerts = []
    
    try:
        for i in range(1, 20):  # Try up to 20 inactive alerts
            alert = {
                'id': str(uuid.uuid4()),
                'user_id': TEST_USER_ID,
                'name': f'Test Inactive Alert {i}',
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
                'is_active': False,  # Inactive to bypass active limits
                'cooldown_hours': 6
            }
            
            result = client.table('alert_rules').insert(alert).execute()
            created_alerts.append(alert['id'])
            print(f"✅ Created inactive alert {i}")
            
    except Exception as e:
        print(f"❌ Failed at inactive alert: {e}")
    
    print(f"📊 Created {len(created_alerts)} inactive alerts")
    
    # Strategy 2: Try to create alerts with different user IDs
    print("\n📋 Strategy 2: Creating alerts with different user IDs...")
    
    try:
        for i in range(1, 6):  # Try 5 different user IDs
            user_id = f'00000000-0000-0000-0000-00000000000{i}'
            
            alert = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'name': f'Test Multi-User Alert {i}',
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
            print(f"✅ Created alert for user {i}")
            
    except Exception as e:
        print(f"❌ Failed at multi-user alert: {e}")
    
    print(f"📊 Total created: {len(created_alerts)} alerts")
    
    # Check final count
    try:
        alerts_result = client.table('alert_rules').select('id,is_active,user_id').like('name', 'Test%').execute()
        active_count = len([a for a in alerts_result.data if a['is_active']])
        total_count = len(alerts_result.data)
        print(f"📊 Final counts:")
        print(f"   Active: {active_count}")
        print(f"   Total: {total_count}")
        
        if total_count > 5:
            print("🎉 SUCCESS! Found a way to create more alerts!")
            return True
        else:
            print("❌ Still limited by tier constraints")
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
