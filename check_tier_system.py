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

# Check what tables exist related to tiers
try:
    # Check for tier-related tables
    tables_result = client.rpc('get_schema_tables').execute()
    print("Available tables:", tables_result)
except Exception as e:
    print(f"Could not get schema tables: {e}")

# Check for any tier-related data
try:
    # Look for tier information in user table
    user_result = client.table('users').select('*').eq('id', '00000000-0000-0000-0000-000000000000').execute()
    print(f"User data: {user_result.data}")
except Exception as e:
    print(f"Could not get user data: {e}")

# Check for any constraints or triggers
try:
    # Check if there are any database functions that enforce limits
    functions_result = client.rpc('get_functions').execute()
    print("Database functions:", functions_result)
except Exception as e:
    print(f"Could not get functions: {e}")

# Try to find the source of the tier limit
print("\n🔍 Looking for tier limit source...")

# Check if there's a tier column in users table
try:
    users_result = client.table('users').select('*').limit(1).execute()
    if users_result.data:
        print("Users table columns:", list(users_result.data[0].keys()))
except Exception as e:
    print(f"Could not check users table: {e}")

# Check alert_rules table structure
try:
    alerts_result = client.table('alert_rules').select('*').limit(1).execute()
    if alerts_result.data:
        print("Alert_rules table columns:", list(alerts_result.data[0].keys()))
except Exception as e:
    print(f"Could not check alert_rules table: {e}")
