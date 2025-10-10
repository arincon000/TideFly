#!/usr/bin/env python3
"""
Create 5 test alerts using the API (handles authentication properly)
"""

import requests
import json
import time

# Test alerts with different scenarios
test_alerts = [
    {
        "name": "🏄‍♂️ Biarritz Perfect Waves",
        "description": "High-quality surf conditions with perfect wave height and low wind",
        "originIata": "LIS",  # Lisbon
        "destIata": "BIQ",    # Biarritz
        "spotId": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # Biarritz spot
        "waveMin": 1.5,
        "waveMax": 2.5,
        "windMax": 15,
        "windowDays": 5,
        "maxPrice": 300,
        "planningLogic": "conservative",
        "expectedHit": True
    },
    {
        "name": "🌊 Ericeira Big Waves",
        "description": "Challenging conditions for experienced surfers",
        "originIata": "MAD",  # Madrid
        "destIata": "LIS",    # Lisbon (closest to Ericeira)
        "spotId": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # Using same spot for testing
        "waveMin": 2.0,
        "waveMax": 4.0,
        "windMax": 20,
        "windowDays": 10,
        "maxPrice": 250,
        "planningLogic": "aggressive",
        "expectedHit": False  # Higher wave requirements, less likely to hit
    },
    {
        "name": "🏖️ Beginner Friendly",
        "description": "Gentle conditions perfect for learning",
        "originIata": "BCN",  # Barcelona
        "destIata": "BIQ",    # Biarritz
        "spotId": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
        "waveMin": 0.5,
        "waveMax": 1.5,
        "windMax": 10,
        "windowDays": 16,
        "maxPrice": 400,
        "planningLogic": "optimistic",
        "expectedHit": True  # Very low requirements, likely to hit
    },
    {
        "name": "💨 Windy Conditions",
        "description": "Testing wind limits - should not hit due to high wind",
        "originIata": "MAD",  # Madrid
        "destIata": "BIQ",    # Biarritz
        "spotId": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
        "waveMin": 1.0,
        "waveMax": 2.0,
        "windMax": 5,     # Very strict wind limit
        "windowDays": 5,
        "maxPrice": 200,
        "planningLogic": "conservative",
        "expectedHit": False  # Very strict wind limit, unlikely to hit
    },
    {
        "name": "💰 Budget Trip",
        "description": "Testing price limits with very low budget",
        "originIata": "OPO",  # Porto
        "destIata": "BIQ",    # Biarritz
        "spotId": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
        "waveMin": 1.2,
        "waveMax": 2.0,
        "windMax": 18,
        "windowDays": 5,
        "maxPrice": 50,   # Very low price limit
        "planningLogic": "conservative",
        "expectedHit": False  # Very low price limit, unlikely to find cheap flights
    }
]

def create_test_alerts():
    """Create all test alerts using the API"""
    print("🚀 Creating 5 test alerts via API...")
    
    base_url = "http://localhost:3000"
    created_alerts = []
    
    for i, alert_data in enumerate(test_alerts, 1):
        try:
            print(f"Creating alert {i}/5: {alert_data['name']}")
            
            # Prepare the API payload
            payload = {
                "name": alert_data["name"],
                "spotId": alert_data["spotId"],
                "originIata": alert_data["originIata"],
                "destIata": alert_data["destIata"],
                "waveMin": alert_data["waveMin"],
                "waveMax": alert_data["waveMax"],
                "windMax": alert_data["windMax"],
                "windowDays": alert_data["windowDays"],
                "maxPrice": alert_data["maxPrice"],
                "planningLogic": alert_data["planningLogic"],
                "daysMask": 127  # All days of the week
            }
            
            # Make API request
            response = requests.post(
                f"{base_url}/api/alerts",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                alert_id = result.get("id", "unknown")
                created_alerts.append({
                    "id": alert_id,
                    "name": alert_data["name"],
                    "expectedHit": alert_data["expectedHit"],
                    "description": alert_data["description"]
                })
                print(f"✅ Alert {i}/5: {alert_data['name']} (ID: {alert_id})")
            else:
                print(f"❌ Failed to create alert {i}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating alert {i} ({alert_data['name']}): {e}")
        
        # Small delay between requests
        time.sleep(0.5)
    
    print(f"\n🎯 Created {len(created_alerts)} test alerts:")
    for alert in created_alerts:
        hit_status = "🎯 Expected HIT" if alert["expectedHit"] else "❌ Expected NO HIT"
        print(f"  • {alert['name']} - {hit_status}")
        print(f"    Description: {alert['description']}")
        print(f"    ID: {alert['id']}")
        print()
    
    return created_alerts

if __name__ == "__main__":
    print("🔧 Make sure the UI server is running on http://localhost:3000")
    print("   Run: cd vercel-app && npm run dev")
    print()
    
    created_alerts = create_test_alerts()
    print(f"✅ Test setup complete! Created {len(created_alerts)} alerts for testing.")
    print("\n🔍 Next steps:")
    print("1. Check the UI at http://localhost:3000/alerts")
    print("2. Test forecast details for each alert")
    print("3. Run the worker to process the alerts")
    print("4. Verify Aviasales links are working correctly")


