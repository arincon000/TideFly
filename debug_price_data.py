#!/usr/bin/env python3
"""
Debug price data availability
"""

import requests
import json

def test_price_data():
    """Test price data availability"""
    base_url = "http://localhost:3000"
    
    # Test quick-forecast-check API
    payload = {
        "ruleId": "test-rule-id",
        "alertRule": {
            "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
            "wave_min_m": 0.5,
            "wave_max_m": 2.5,
            "wind_max_kmh": 20,
            "forecast_window": 5,
            "origin_iata": "LIS",
            "dest_iata": "BIQ",
            "max_price_eur": 500,
            "planning_logic": "conservative"
        }
    }
    
    try:
        response = requests.post(f"{base_url}/api/quick-forecast-check", json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            print("Quick Forecast Check Response:")
            print(f"  conditionsGood: {data.get('conditionsGood')}")
            print(f"  priceDataAvailable: {data.get('priceDataAvailable')}")
            print(f"  priceFreshness: {data.get('priceFreshness')}")
            print(f"  shouldTriggerWorker: {data.get('shouldTriggerWorker')}")
            
            if 'priceData' in data:
                price_data = data['priceData']
                print(f"  priceData: {price_data}")
            else:
                print("  priceData: None")
        else:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_price_data()
