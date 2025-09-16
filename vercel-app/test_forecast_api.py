#!/usr/bin/env python3
import requests
import json

# Test the forecast details API
base_url = "http://localhost:3000"
rule_id = "ad95c53d-1071-404e-8b88-80352db66aa0"  # One of the test alert IDs

# Sample alert rule data
alert_rule = {
    "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # Biarritz spot ID (correct one)
    "wave_min_m": 0.5,
    "wave_max_m": 1.0,
    "wind_max_kmh": 5.0,
    "forecast_window": 5
}

try:
    print(f"Testing API endpoint: {base_url}/api/forecast-details?ruleId={rule_id}")
    print(f"Alert rule data: {json.dumps(alert_rule, indent=2)}")
    
    response = requests.post(
        f"{base_url}/api/forecast-details?ruleId={rule_id}",
        headers={'Content-Type': 'application/json'},
        json=alert_rule
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Text: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Received {len(data.get('days', []))} forecast days")
    else:
        print(f"Error: {response.status_code}")
        
except Exception as e:
    print(f"Error: {e}")
    print("Make sure the Next.js dev server is running on localhost:3000")
