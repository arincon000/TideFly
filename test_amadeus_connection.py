#!/usr/bin/env python3
"""
Test Amadeus API Connection
"""

import os
import requests
import json
from dotenv import load_dotenv

def test_amadeus_connection():
    """Test if Amadeus API credentials work"""
    
    # Load environment variables
    load_dotenv()
    
    client_id = os.getenv("AMADEUS_CLIENT_ID")
    client_secret = os.getenv("AMADEUS_CLIENT_SECRET")
    amadeus_env = os.getenv("AMADEUS_ENV", "test").lower()
    amadeus_mode = os.getenv("AMADEUS_MODE", "api").lower()
    
    print("🔍 Testing Amadeus API Connection...")
    print(f"Environment: {amadeus_env}")
    print(f"Mode: {amadeus_mode}")
    print(f"Client ID: {client_id[:8]}..." if client_id else "❌ Not set")
    print(f"Client Secret: {'✅ Set' if client_secret else '❌ Not set'}")
    
    if not client_id or not client_secret:
        print("❌ Missing Amadeus credentials!")
        print("Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in your .env.local file")
        return False
    
    if amadeus_mode == "fake":
        print("⚠️  Currently in FAKE mode. Change AMADEUS_MODE to 'api' to use real API")
        return False
    
    # Test API endpoint
    base_url = "https://api.amadeus.com" if amadeus_env == "prod" else "https://test.api.amadeus.com"
    
    try:
        # Get access token
        print("\n🔑 Getting access token...")
        token_url = f"{base_url}/v1/security/oauth2/token"
        token_data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        response = requests.post(token_url, data=token_data, timeout=10)
        
        if response.status_code == 200:
            token_info = response.json()
            access_token = token_info.get("access_token")
            print("✅ Access token obtained successfully!")
            
            # Test a simple API call
            print("\n✈️  Testing flight search API...")
            search_url = f"{base_url}/v2/shopping/flight-offers"
            headers = {"Authorization": f"Bearer {access_token}"}
            params = {
                "originLocationCode": "LIS",
                "destinationLocationCode": "BIQ", 
                "departureDate": "2025-10-01",
                "adults": 1
            }
            
            search_response = requests.get(search_url, headers=headers, params=params, timeout=10)
            
            if search_response.status_code == 200:
                search_data = search_response.json()
                offers = search_data.get("data", [])
                print(f"✅ Flight search successful! Found {len(offers)} offers")
                
                if offers:
                    first_offer = offers[0]
                    price = first_offer.get("price", {}).get("total", "N/A")
                    print(f"💰 Sample price: {price}")
                
                return True
            else:
                print(f"❌ Flight search failed: {search_response.status_code}")
                print(f"Response: {search_response.text}")
                return False
                
        else:
            print(f"❌ Token request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_amadeus_connection()
    if success:
        print("\n🎉 Amadeus API is working correctly!")
        print("You can now run the automated tests again.")
    else:
        print("\n⚠️  Amadeus API test failed. Please check your credentials.")
