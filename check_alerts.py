#!/usr/bin/env python3

import os
import sys
sys.path.append('vercel-app')

from supabase import create_client

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.local')

# Create Supabase client
client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# Get all alerts
result = client.table('alert_rules').select('id,name,is_active,last_checked_at').execute()

print(f"Found {len(result.data)} alerts:")
for alert in result.data[:10]:
    print(f"- {alert['name']} (active: {alert['is_active']}, last_checked: {alert['last_checked_at']})")

if len(result.data) > 10:
    print(f"... and {len(result.data) - 10} more")