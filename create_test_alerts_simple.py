#!/usr/bin/env python3
"""
Create test alerts using the API endpoint
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")

# API endpoint
API_URL = "http://localhost:3000/api/alerts"

def create_test_alert(alert_data):
    """Create a test alert via API"""
    try:
        response = requests.post(API_URL, json=alert_data)
        if response.status_code == 200:
            result = response.json()
            return result.get("id")
        else:
            print(f"❌ Failed to create alert: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating alert: {e}")
        return None

def main():
    print("🎯 Creating test alerts via API...")
    
    # Test alerts data
    test_alerts = [
        {
            "name": "Test Alert 1 - Very Likely to Hit",
            "description": "Very loose conditions - should almost always hit",
            "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # BIQ spot
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
            "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
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
            "name": "Test Alert 3 - Moderate Conditions",
            "description": "Moderate conditions - might hit depending on forecast",
            "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
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
            "name": "Test Alert 4 - Optimistic Planning",
            "description": "Using optimistic planning logic",
            "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
            "origin_iata": "LIS",
            "dest_iata": "BIQ",
            "wave_min_m": 0.5,
            "wave_max_m": 2.0,
            "wind_max_kmh": 15.0,
            "forecast_window": 5,
            "planning_logic": "optimistic",
            "user_email": "test@example.com"
        },
        {
            "name": "Test Alert 5 - Edge Case",
            "description": "Edge case with very specific conditions",
            "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
            "origin_iata": "LIS",
            "dest_iata": "BIQ",
            "wave_min_m": 1.5,
            "wave_max_m": 2.0,
            "wind_max_kmh": 12.0,
            "forecast_window": 5,
            "planning_logic": "conservative",
            "user_email": "test@example.com"
        }
    ]
    
    created_alerts = []
    
    for i, alert_data in enumerate(test_alerts, 1):
        print(f"Creating Test Alert {i}...")
        alert_id = create_test_alert(alert_data)
        if alert_id:
            created_alerts.append(alert_id)
            print(f"✅ Created: {alert_data['name']} (ID: {alert_id})")
        else:
            print(f"❌ Failed to create: {alert_data['name']}")
    
    if created_alerts:
        print(f"\n🎉 Successfully created {len(created_alerts)} test alerts!")
        print("\n📋 Test Alert Summary:")
        print("1. Very Likely to Hit - Should trigger booking links immediately")
        print("2. Unlikely to Hit - Should show 'No hit' status")
        print("3. Moderate Conditions - Depends on current forecast")
        print("4. Optimistic Planning - Different planning logic")
        print("5. Edge Case - Very specific conditions")
        
        print(f"\n🔗 Alert IDs: {', '.join(created_alerts)}")
        print("\n✅ Ready for testing!")
    else:
        print("❌ Failed to create any test alerts")

if __name__ == "__main__":
    main()


