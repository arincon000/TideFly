#!/usr/bin/env python3
"""
Create 5 test alerts with different scenarios for comprehensive testing
"""

import os
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('vercel-app/.env.local')
url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not url or not key:
    print("❌ Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(url, key)

# Test alerts with different scenarios
test_alerts = [
    {
        "name": "🏄‍♂️ Biarritz Perfect Waves",
        "description": "High-quality surf conditions with perfect wave height and low wind",
        "origin_iata": "LIS",  # Lisbon
        "dest_iata": "BIQ",    # Biarritz
        "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # Biarritz spot
        "wave_min_m": 1.5,
        "wave_max_m": 2.5,
        "wind_max_kmh": 15,
        "forecast_window": 5,
        "max_price_eur": 300,
        "planning_logic": "conservative",
        "expected_hit": True
    },
    {
        "name": "🌊 Ericeira Big Waves",
        "description": "Challenging conditions for experienced surfers",
        "origin_iata": "MAD",  # Madrid
        "dest_iata": "LIS",    # Lisbon (closest to Ericeira)
        "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # Using same spot for testing
        "wave_min_m": 2.0,
        "wave_max_m": 4.0,
        "wind_max_kmh": 20,
        "forecast_window": 10,
        "max_price_eur": 250,
        "planning_logic": "aggressive",
        "expected_hit": False  # Higher wave requirements, less likely to hit
    },
    {
        "name": "🏖️ Beginner Friendly",
        "description": "Gentle conditions perfect for learning",
        "origin_iata": "BCN",  # Barcelona
        "dest_iata": "BIQ",    # Biarritz
        "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
        "wave_min_m": 0.5,
        "wave_max_m": 1.5,
        "wind_max_kmh": 10,
        "forecast_window": 16,
        "max_price_eur": 400,
        "planning_logic": "optimistic",
        "expected_hit": True  # Very low requirements, likely to hit
    },
    {
        "name": "💨 Windy Conditions",
        "description": "Testing wind limits - should not hit due to high wind",
        "origin_iata": "MAD",  # Madrid
        "dest_iata": "BIQ",    # Biarritz
        "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
        "wave_min_m": 1.0,
        "wave_max_m": 2.0,
        "wind_max_kmh": 5,     # Very strict wind limit
        "forecast_window": 5,
        "max_price_eur": 200,
        "planning_logic": "conservative",
        "expected_hit": False  # Very strict wind limit, unlikely to hit
    },
    {
        "name": "💰 Budget Trip",
        "description": "Testing price limits with very low budget",
        "origin_iata": "OPO",  # Porto
        "dest_iata": "BIQ",    # Biarritz
        "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
        "wave_min_m": 1.2,
        "wave_max_m": 2.0,
        "wind_max_kmh": 18,
        "forecast_window": 5,
        "max_price_eur": 50,   # Very low price limit
        "planning_logic": "conservative",
        "expected_hit": False  # Very low price limit, unlikely to find cheap flights
    }
]

def create_test_alerts():
    """Create all test alerts"""
    print("🚀 Creating 5 test alerts for comprehensive testing...")
    
    created_alerts = []
    
    for i, alert_data in enumerate(test_alerts, 1):
        try:
            # Generate unique ID
            alert_id = str(uuid.uuid4())
            
            # Prepare alert payload
            alert_payload = {
                "id": alert_id,
                "user_id": "00000000-0000-0000-0000-000000000000",  # Test user ID
                "name": alert_data["name"],
                "mode": "spot",
                "spot_id": alert_data["spot_id"],
                "origin_iata": alert_data["origin_iata"],
                "dest_iata": alert_data["dest_iata"],
                "wave_min_m": alert_data["wave_min_m"],
                "wave_max_m": alert_data["wave_max_m"],
                "wind_max_kmh": alert_data["wind_max_kmh"],
                "forecast_window": alert_data["forecast_window"],
                "max_price_eur": alert_data["max_price_eur"],
                "planning_logic": alert_data["planning_logic"],
                "days_mask": 127,  # All days of the week
                "is_active": True,
                "cooldown_hours": 6,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert alert
            result = supabase.table('alert_rules').insert(alert_payload).execute()
            
            if result.data:
                created_alerts.append({
                    "id": alert_id,
                    "name": alert_data["name"],
                    "expected_hit": alert_data["expected_hit"],
                    "description": alert_data["description"]
                })
                print(f"✅ Alert {i}/5: {alert_data['name']} (ID: {alert_id})")
            else:
                print(f"❌ Failed to create alert {i}: {alert_data['name']}")
                
        except Exception as e:
            print(f"❌ Error creating alert {i} ({alert_data['name']}): {e}")
    
    print(f"\n🎯 Created {len(created_alerts)} test alerts:")
    for alert in created_alerts:
        hit_status = "🎯 Expected HIT" if alert["expected_hit"] else "❌ Expected NO HIT"
        print(f"  • {alert['name']} - {hit_status}")
        print(f"    Description: {alert['description']}")
        print(f"    ID: {alert['id']}")
        print()
    
    return created_alerts

if __name__ == "__main__":
    created_alerts = create_test_alerts()
    print(f"✅ Test setup complete! Created {len(created_alerts)} alerts for testing.")
    print("\n🔍 Next steps:")
    print("1. Check the UI at http://localhost:3000/alerts")
    print("2. Test forecast details for each alert")
    print("3. Run the worker to process the alerts")
    print("4. Verify Aviasales links are working correctly")



