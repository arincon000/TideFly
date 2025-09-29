#!/usr/bin/env python3
"""
Clean up test alerts from the database
"""

import os
import sys
from datetime import datetime, timedelta
import pytz

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

# Test user ID
TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

print("🧹 Cleaning up test alerts...")

try:
    # Delete all alerts for the test user
    result = client.table('alert_rules').delete().eq('user_id', TEST_USER_ID).execute()
    
    if result.data:
        print(f"✅ Successfully deleted {len(result.data)} test alerts")
    else:
        print("❌ No test alerts found to delete")
        
    # Also clean up any alert events for the test user
    events_result = client.table('alert_events').delete().eq('rule_id', TEST_USER_ID).execute()
    if events_result.data:
        print(f"✅ Also cleaned up {len(events_result.data)} alert events")
        
except Exception as e:
    print(f"❌ Error cleaning up test alerts: {e}")

print("🎉 Test alerts cleanup complete!")
