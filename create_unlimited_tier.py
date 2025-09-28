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

TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

def main():
    print("🚀 Creating unlimited tier for testing...")
    
    # First, let's try to update the existing user to a different tier
    tier_options = ['pro', 'premium', 'enterprise', 'unlimited', 'test', 'dev']
    
    for tier in tier_options:
        try:
            # Update user tier
            result = client.table('users').update({
                'plan_tier': tier,
                'plan_expires_at': '2026-12-31T23:59:59Z'  # Far future
            }).eq('id', TEST_USER_ID).execute()
            
            print(f"✅ Updated user to tier: {tier}")
            
            # Test if this tier allows more alerts
            test_alert = {
                'id': 'test-tier-check',
                'user_id': TEST_USER_ID,
                'name': 'Test Tier Check',
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
            
            # Try to create a second alert
            result2 = client.table('alert_rules').insert(test_alert).execute()
            print(f"✅ Tier '{tier}' allows multiple alerts!")
            
            # Clean up test alert
            client.table('alert_rules').delete().eq('id', 'test-tier-check').execute()
            print(f"🎉 Success! Using tier: {tier}")
            return tier
            
        except Exception as e:
            print(f"❌ Tier '{tier}' failed: {e}")
            # Clean up any partial test alert
            try:
                client.table('alert_rules').delete().eq('id', 'test-tier-check').execute()
            except:
                pass
            continue
    
    print("❌ No tier worked for unlimited alerts")
    return None

if __name__ == "__main__":
    main()
