#!/usr/bin/env python3
"""
Clean up existing alerts and create comprehensive test alerts
"""

import os
import sys
import requests
import json
from datetime import datetime, timedelta
from supabase import create_client, Client

# Add the worker directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'worker'))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(".env.local")

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for admin operations

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def cleanup_existing_alerts():
    """Delete all existing alerts"""
    print("🧹 Cleaning up existing alerts...")
    
    try:
        # Delete all alert rules
        result = supabase.table("alert_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"✅ Deleted {len(result.data)} existing alerts")
        
        # Delete all alert events
        result = supabase.table("alert_events").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"✅ Deleted {len(result.data)} existing alert events")
        
        # Clear price cache
        result = supabase.table("price_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"✅ Cleared {len(result.data)} price cache entries")
        
    except Exception as e:
        print(f"❌ Error cleaning up: {e}")
        return False
    
    return True

def create_test_alerts():
    """Create 5 test alerts with different scenarios"""
    print("🎯 Creating test alerts...")
    
    # Get a spot ID (using the one from the logs)
    spot_id = "15bbdb3e-504a-4c50-8d34-6450104c22b3"  # BIQ spot
    
    test_alerts = [
        {
            "name": "Test Alert 1 - Very Likely to Hit",
            "description": "Very loose conditions - should almost always hit",
            "spot_id": spot_id,
            "origin_iata": "LIS",
            "dest_iata": "BIQ",
            "wave_min_m": 0.0,
            "wave_max_m": 10.0,  # Very high max
            "wind_max_kmh": 50.0,  # Very high max
            "forecast_window": 5,
            "planning_logic": "conservative",
            "user_email": "test@example.com"
        },
        {
            "name": "Test Alert 2 - Unlikely to Hit",
            "description": "Very strict conditions - unlikely to hit",
            "spot_id": spot_id,
            "origin_iata": "LIS", 
            "dest_iata": "BIQ",
            "wave_min_m": 3.0,  # High minimum
            "wave_max_m": 3.5,  # Very narrow range
            "wind_max_kmh": 5.0,  # Very low max wind
            "forecast_window": 5,
            "planning_logic": "conservative",
            "user_email": "test@example.com"
        },
        {
            "name": "Test Alert 3 - Edge Case (No Spot)",
            "description": "Alert without spot_id - should be handled gracefully",
            "spot_id": None,  # No spot ID
            "origin_iata": "LIS",
            "dest_iata": "BIQ", 
            "wave_min_m": 1.0,
            "wave_max_m": 2.0,
            "wind_max_kmh": 15.0,
            "forecast_window": 5,
            "planning_logic": "conservative",
            "user_email": "test@example.com"
        },
        {
            "name": "Test Alert 4 - Moderate Conditions",
            "description": "Moderate conditions - might hit depending on forecast",
            "spot_id": spot_id,
            "origin_iata": "LIS",
            "dest_iata": "BIQ",
            "wave_min_m": 1.0,
            "wave_max_m": 2.5,
            "wind_max_kmh": 20.0,
            "forecast_window": 5,
            "planning_logic": "conservative", 
            "user_email": "test@example.com"
        },
        {
            "name": "Test Alert 5 - Different Planning Logic",
            "description": "Using optimistic planning logic",
            "spot_id": spot_id,
            "origin_iata": "LIS",
            "dest_iata": "BIQ",
            "wave_min_m": 0.5,
            "wave_max_m": 2.0,
            "wind_max_kmh": 15.0,
            "forecast_window": 5,
            "planning_logic": "optimistic",
            "user_email": "test@example.com"
        }
    ]
    
    created_alerts = []
    
    for alert_data in test_alerts:
        try:
            result = supabase.table("alert_rules").insert(alert_data).execute()
            if result.data:
                alert_id = result.data[0]["id"]
                created_alerts.append(alert_id)
                print(f"✅ Created: {alert_data['name']} (ID: {alert_id})")
            else:
                print(f"❌ Failed to create: {alert_data['name']}")
        except Exception as e:
            print(f"❌ Error creating {alert_data['name']}: {e}")
    
    return created_alerts

def main():
    print("🚀 Starting comprehensive test setup...")
    
    # Step 1: Clean up
    if not cleanup_existing_alerts():
        print("❌ Failed to clean up existing alerts")
        return
    
    # Step 2: Create test alerts
    created_alerts = create_test_alerts()
    
    if created_alerts:
        print(f"\n🎉 Successfully created {len(created_alerts)} test alerts!")
        print("\n📋 Test Alert Summary:")
        print("1. Very Likely to Hit - Should trigger booking links immediately")
        print("2. Unlikely to Hit - Should show 'No hit' status") 
        print("3. No Spot ID - Should be handled gracefully")
        print("4. Moderate Conditions - Depends on current forecast")
        print("5. Optimistic Planning - Different planning logic")
        
        print(f"\n🔗 Alert IDs: {', '.join(created_alerts)}")
        print("\n✅ Ready for testing! You can now:")
        print("1. Check the UI to see the alerts")
        print("2. Open forecast details to see booking links")
        print("3. Run the worker locally to test the complete flow")
    else:
        print("❌ Failed to create test alerts")

if __name__ == "__main__":
    main()
