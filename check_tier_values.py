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

# Check existing users to see what tier values are used
try:
    users_result = client.table('users').select('plan_tier').execute()
    print("Existing tier values:")
    for user in users_result.data:
        print(f"  - {user.get('plan_tier', 'NULL')}")
    
    # Get unique tier values
    unique_tiers = set(user.get('plan_tier') for user in users_result.data)
    print(f"\nUnique tier values: {unique_tiers}")
    
except Exception as e:
    print(f"Could not get tier values: {e}")

# Try to create user with different tier values
TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

# Common tier values to try
tier_values = ['free', 'basic', 'premium', 'pro', 'enterprise', 'unlimited', 'trial']

for tier in tier_values:
    try:
        user_data = {
            'id': TEST_USER_ID,
            'email': f'test-{tier}@tidefly.com',
            'home_airport': 'LIS',
            'plan_tier': tier,
            'created_at': '2025-01-01T00:00:00Z'
        }
        
        result = client.table('users').insert(user_data).execute()
        print(f"✅ Successfully created user with tier: {tier}")
        break
        
    except Exception as e:
        print(f"❌ Tier '{tier}' failed: {e}")
        continue
