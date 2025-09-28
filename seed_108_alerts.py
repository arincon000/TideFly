import os
import sys
from datetime import datetime, timedelta
import pytz
import json
import uuid

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
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

# Test user ID (must match the one created in create_test_user.py)
TEST_USER_ID = '00000000-0000-0000-0000-000000000000'
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

print("🚀 Seeding 108 test alerts...")

# Clean up existing test alerts first
print("🧹 Cleaning up existing test alerts...")
client.table('alert_rules').delete().eq('user_id', TEST_USER_ID).execute()

alerts_to_insert = []
for logic in PLANNING_LOGICS:
    for window in FORECAST_WINDOWS:
        for wave_min, wave_max in WAVE_RANGES:
            alert_name = f"Test Alert {logic.capitalize()} {window}-day {wave_min}-{wave_max}m"
            alerts_to_insert.append({
                'id': str(uuid.uuid4()),
                'user_id': TEST_USER_ID,
                'name': alert_name,
                'mode': 'spot',
                'spot_id': SPOT_ID,
                'origin_iata': ORIGIN_IATA,
                'dest_iata': DEST_IATA,
                'wave_min_m': wave_min,
                'wave_max_m': wave_max,
                'wind_max_kmh': WIND_MAX_KMH,
                'forecast_window': window,
                'max_price_eur': 500, # Default price for now
                'planning_logic': logic,
                'days_mask': 127, # All days of the week
                'is_active': True,
                'cooldown_hours': 6,
                'created_at': datetime.now(pytz.utc).isoformat(),
                'updated_at': datetime.now(pytz.utc).isoformat()
            })

# Supabase insert has a limit of 1000 rows per request, so we'll batch
batch_size = 50
inserted_count = 0
for i in range(0, len(alerts_to_insert), batch_size):
    batch = alerts_to_insert[i:i + batch_size]
    try:
        response = client.table('alert_rules').insert(batch).execute()
        if response.data:
            inserted_count += len(response.data)
            print(f"✅ Successfully inserted batch {i//batch_size + 1}")
        elif response.error:
            print(f"❌ Error inserting batch {i//batch_size + 1}: {response.error}")
            break # Stop if an error occurs
    except Exception as e:
        print(f"❌ Unexpected error inserting batch {i//batch_size + 1}: {e}")
        break

print(f"🎉 Successfully inserted {inserted_count} test alerts!")

# Verify insertion
verification_result = client.table('alert_rules').select('id').eq('user_id', TEST_USER_ID).execute()
print(f"📊 Verification: {len(verification_result.data)} alerts found in database")

# Show breakdown by planning logic
for logic in PLANNING_LOGICS:
    count = client.table('alert_rules').select('id').eq('user_id', TEST_USER_ID).eq('planning_logic', logic).execute()
    print(f"   {logic.capitalize()}: {len(count.data)} alerts")

print("\n📧 Email Testing Note:")
print("   - All 108 alerts will be created")
print("   - Worker will process all alerts")
print("   - Only first 10 alerts will send emails (to avoid spam)")
print("   - You'll get a sample of emails to test the system")