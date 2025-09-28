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

def main():
    print("🔍 Finding and modifying tier limits...")
    
    # Strategy 1: Try to find database functions that enforce limits
    print("\n📋 Strategy 1: Looking for database functions...")
    try:
        # Try to get database functions
        functions_result = client.rpc('get_functions').execute()
        if functions_result.data:
            print("Database functions found:")
            for func in functions_result.data:
                if 'tier' in func.get('function_name', '').lower() or 'limit' in func.get('function_name', '').lower():
                    print(f"  - {func.get('function_name', 'Unknown')}")
        else:
            print("No functions found or error occurred")
    except Exception as e:
        print(f"Could not get functions: {e}")
    
    # Strategy 2: Try to find RLS policies
    print("\n📋 Strategy 2: Looking for RLS policies...")
    try:
        policies_result = client.rpc('get_policies', {'table_name': 'alert_rules'}).execute()
        if policies_result.data:
            print("RLS policies on alert_rules:")
            for policy in policies_result.data:
                print(f"  - {policy}")
        else:
            print("No policies found or error occurred")
    except Exception as e:
        print(f"Could not get policies: {e}")
    
    # Strategy 3: Try to create tier_limits table and set unlimited limits
    print("\n📋 Strategy 3: Creating tier_limits table...")
    try:
        # Create tier_limits table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS tier_limits (
            tier_name VARCHAR(50) PRIMARY KEY,
            max_active_alerts INTEGER NOT NULL DEFAULT 0,
            max_total_alerts INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # Insert unlimited tier limits
        insert_limits_sql = """
        INSERT INTO tier_limits (tier_name, max_active_alerts, max_total_alerts) 
        VALUES ('unlimited', 999, 999)
        ON CONFLICT (tier_name) 
        DO UPDATE SET 
            max_active_alerts = 999,
            max_total_alerts = 999;
        """
        
        # Try to execute these via RPC
        print("Attempting to create tier_limits table...")
        # Note: This might not work depending on permissions
        
    except Exception as e:
        print(f"Could not create tier_limits table: {e}")
    
    # Strategy 4: Try to find where the limits are hardcoded
    print("\n📋 Strategy 4: Testing different approaches...")
    
    # Try to create alerts with different user IDs to see if it's per-user limits
    try:
        import uuid
        test_user_id = str(uuid.uuid4())
        
        alert = {
            'id': str(uuid.uuid4()),
            'user_id': test_user_id,
            'name': 'Test Different User',
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
        
        result = client.table('alert_rules').insert(alert).execute()
        print("✅ Successfully created alert with different user ID")
        
        # Clean up
        client.table('alert_rules').delete().eq('id', alert['id']).execute()
        print("🧹 Cleaned up test alert")
        
    except Exception as e:
        print(f"❌ Failed with different user ID: {e}")

if __name__ == "__main__":
    main()
