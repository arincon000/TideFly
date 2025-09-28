#!/usr/bin/env python3

import os
import sys
from datetime import datetime, timedelta
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

# Test user data
TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

def create_test_user():
    """Create test user with unlimited tier"""
    
    user_data = {
        'id': TEST_USER_ID,
        'email': 'test@tidefly.com',
        'home_airport': 'LIS',
        'plan_tier': 'unlimited',  # Give unlimited tier
        'plan_expires_at': (datetime.utcnow() + timedelta(days=365)).isoformat(),  # 1 year from now
        'created_at': datetime.utcnow().isoformat()
    }
    
    try:
        # First, try to get existing user
        existing = client.table('users').select('*').eq('id', TEST_USER_ID).execute()
        
        if existing.data:
            print(f"✅ Test user already exists: {existing.data[0]['email']}")
            print(f"   Tier: {existing.data[0].get('plan_tier', 'None')}")
            return True
        else:
            # Create new user
            result = client.table('users').insert(user_data).execute()
            print(f"✅ Created test user: {user_data['email']}")
            print(f"   Tier: {user_data['plan_tier']}")
            return True
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        return False

def main():
    print("🚀 Creating test user with unlimited tier...")
    
    success = create_test_user()
    
    if success:
        print("🎉 Test user ready for unlimited alerts!")
    else:
        print("❌ Failed to create test user")

if __name__ == "__main__":
    main()
