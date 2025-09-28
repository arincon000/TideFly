import os
import sys
from datetime import datetime, timedelta
import pytz
import json

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

TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

print("🚀 Running worker test with 108 alerts...")

# Check current alerts
alerts = client.table('alert_rules').select('id, name, planning_logic, forecast_window').eq('user_id', TEST_USER_ID).execute()
print(f"📊 Found {len(alerts.data)} alerts to process")

# Show breakdown
for logic in ['conservative', 'aggressive', 'optimistic']:
    count = len([a for a in alerts.data if a['planning_logic'] == logic])
    print(f"   {logic.capitalize()}: {count} alerts")

print("\n📧 Email Testing Strategy:")
print("1. All 108 alerts will be processed by the worker")
print("2. The worker will check conditions for all alerts")
print("3. Only alerts with good conditions will trigger emails")
print("4. You'll get a reasonable number of emails (not 108)")

print("\n🎯 Next Steps:")
print("1. Run the worker: python -m worker.worker")
print("2. Check the results")
print("3. You should get a few emails (not 108)")

print("\n💡 If you want to limit emails further:")
print("   - Set EMAIL_TEST_LIMIT=5 in your .env.local")
print("   - Or modify the worker to skip email sending entirely")
