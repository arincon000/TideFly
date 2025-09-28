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

# Test user IDs - we'll create multiple users to distribute the alerts
TEST_USER_IDS = [
    '00000000-0000-0000-0000-000000000000',  # Original test user
    '00000000-0000-0000-0000-000000000001',  # User 2
    '00000000-0000-0000-0000-000000000002',  # User 3
    '00000000-0000-0000-0000-000000000003',  # User 4
    '00000000-0000-0000-0000-000000000004',  # User 5
    '00000000-0000-0000-0000-000000000005',  # User 6
    '00000000-0000-0000-0000-000000000006',  # User 7
    '00000000-0000-0000-0000-000000000007',  # User 8
    '00000000-0000-0000-0000-000000000008',  # User 9
    '00000000-0000-0000-0000-000000000009',  # User 10
]

SPOT_ID = '15bbdb3e-504a-4c50-8d34-6450104c22b3' # Biarritz spot
ORIGIN_IATA = 'LIS' # Lisbon
DEST_IATA = 'BIQ' # Biarritz

PLANNING_LOGICS = ['conservative', 'aggressive', 'optimistic']
FORECAST_WINDOWS = [5, 10, 16]
WAVE_RANGES = [
    (0.5, 1.5), (0.5, 2.0), (0.5, 2.5), (0.5, 3.0),
    (1.0, 2.0), (1.0, 2.5), (1.0, 3.0), (1.0, 3.5),
    (1.5, 2.5), (1.5, 3.0), (1.5, 3.5), (1.5, 4.0)
]
WIND_MAX_KMH = 20 # Fixed wind for simplicity

def create_test_users():
    """Create test users with unlimited tier"""
    print("👥 Creating test users...")
    
    for i, user_id in enumerate(TEST_USER_IDS):
        try:
            # Create user
            user_data = {
                'id': user_id,
                'email': f'test{i}@example.com',
                'home_airport': 'LIS',
                'created_at': '2025-01-01T00:00:00Z',
                'plan_tier': 'unlimited',
                'plan_expires_at': '2026-12-31T23:59:59Z'
            }
            
            # Try to insert user (ignore if exists)
            try:
                client.table('users').insert(user_data).execute()
                print(f"✅ Created user {i+1}")
            except Exception as e:
                if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
                    print(f"ℹ️ User {i+1} already exists")
                else:
                    print(f"⚠️ Error creating user {i+1}: {e}")
                    
        except Exception as e:
            print(f"❌ Failed to create user {i+1}: {e}")

def main():
    print("🚀 Seeding 108 test alerts across multiple users...")
    
    # First, create test users
    create_test_users()
    
    # Clean up any existing test alerts
    try:
        for user_id in TEST_USER_IDS:
            client.table('alert_rules').delete().eq('user_id', user_id).like('name', 'Test Alert%').execute()
        print("🧹 Cleaned up existing test alerts")
    except Exception as e:
        print(f"⚠️ Could not clean up: {e}")
    
    # Generate alerts
    alerts_to_insert = []
    user_index = 0
    
    for logic in PLANNING_LOGICS:
        for window in FORECAST_WINDOWS:
            for wave_min, wave_max in WAVE_RANGES:
                alert_name = f"Test Alert {logic.capitalize()} {window}-day {wave_min}-{wave_max}m"
                user_id = TEST_USER_IDS[user_index % len(TEST_USER_IDS)]
                
                alerts_to_insert.append({
                    'id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'name': alert_name,
                    'mode': 'spot',
                    'spot_id': SPOT_ID,
                    'origin_iata': ORIGIN_IATA,
                    'dest_iata': DEST_IATA,
                    'wave_min_m': wave_min,
                    'wave_max_m': wave_max,
                    'wind_max_kmh': WIND_MAX_KMH,
                    'forecast_window': window,
                    'max_price_eur': 500,
                    'planning_logic': logic,
                    'days_mask': 127,
                    'is_active': True,
                    'cooldown_hours': 6,
                    'created_at': '2025-01-01T00:00:00Z',
                    'updated_at': '2025-01-01T00:00:00Z'
                })
                
                user_index += 1
    
    print(f"📝 Generated {len(alerts_to_insert)} test alerts")
    
    # Insert alerts in batches
    batch_size = 10  # Smaller batches to avoid limits
    inserted_count = 0
    
    for i in range(0, len(alerts_to_insert), batch_size):
        batch = alerts_to_insert[i:i + batch_size]
        try:
            response = client.table('alert_rules').insert(batch).execute()
            if response.data:
                inserted_count += len(response.data)
                print(f"✅ Successfully inserted batch {i//batch_size + 1} ({len(response.data)} alerts)")
            elif response.error:
                print(f"❌ Error inserting batch {i//batch_size + 1}: {response.error}")
                break
        except Exception as e:
            print(f"❌ Unexpected error inserting batch {i//batch_size + 1}: {e}")
            break
    
    print(f"🎉 Successfully inserted {inserted_count} test alerts!")
    
    # Verify insertion
    total_alerts = 0
    for user_id in TEST_USER_IDS:
        try:
            verification_result = client.table('alert_rules').select('id').eq('user_id', user_id).execute()
            user_count = len(verification_result.data)
            total_alerts += user_count
            if user_count > 0:
                print(f"📊 User {user_id[-1]}: {user_count} alerts")
        except Exception as e:
            print(f"❌ Could not verify user {user_id}: {e}")
    
    print(f"📊 Total alerts in database: {total_alerts}")

if __name__ == "__main__":
    main()
