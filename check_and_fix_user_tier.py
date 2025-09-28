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
    print("🔍 Checking current user tier...")
    
    # Check current user tier
    try:
        user_result = client.table('users').select('*').eq('id', TEST_USER_ID).execute()
        if user_result.data:
            user = user_result.data[0]
            print(f"👤 Current user tier: {user.get('plan_tier', 'None')}")
            print(f"   Expires: {user.get('plan_expires_at', 'None')}")
            
            if user.get('plan_tier') != 'unlimited':
                print("🔄 Updating user to unlimited tier...")
                update_result = client.table('users').update({
                    'plan_tier': 'unlimited',
                    'plan_expires_at': '2026-12-31T23:59:59Z'
                }).eq('id', TEST_USER_ID).execute()
                
                if update_result.data:
                    print("✅ Successfully updated user to unlimited tier")
                else:
                    print(f"❌ Failed to update user: {update_result.error}")
            else:
                print("✅ User already has unlimited tier")
        else:
            print("❌ Test user not found")
    except Exception as e:
        print(f"❌ Error checking/updating user: {e}")
    
    # Check current alert count
    try:
        alerts_result = client.table('alert_rules').select('id,is_active').eq('user_id', TEST_USER_ID).execute()
        active_count = len([a for a in alerts_result.data if a['is_active']])
        total_count = len(alerts_result.data)
        print(f"\n📊 Current alerts for test user:")
        print(f"   Active: {active_count}")
        print(f"   Total: {total_count}")
    except Exception as e:
        print(f"❌ Could not get alert count: {e}")

if __name__ == "__main__":
    main()
