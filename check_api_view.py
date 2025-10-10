import os
import pathlib
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(pathlib.Path(__file__).resolve().parent / "vercel-app" / ".env.local")

# Connect to Supabase
url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

print("🔗 Connected to Supabase successfully!")

# Check the API view that the frontend uses
print("\n📊 Checking API view (v1_alert_rules):")
try:
    result = supabase.table("v1_alert_rules").select("*").execute()
    print(f"Found {len(result.data)} alerts in API view:")
    for alert in result.data:
        print(f"  - {alert.get('name', 'Unnamed')} (ID: {alert.get('id', 'Unknown')[:8]}...)")
        print(f"    Active: {alert.get('is_active', False)}")
        print(f"    Created: {alert.get('created_at', 'Unknown')}")
        print()
except Exception as e:
    print(f"Error fetching from API view: {e}")

# Check if we can access the API view with different schema
print("\n📊 Checking api.v1_alert_rules:")
try:
    result = supabase.rpc('get_alert_rules').execute()
    print(f"Found {len(result.data)} alerts via RPC:")
    for alert in result.data:
        print(f"  - {alert.get('name', 'Unnamed')} (ID: {alert.get('id', 'Unknown')[:8]}...)")
        print()
except Exception as e:
    print(f"Error fetching via RPC: {e}")

# Let's try to create a test alert to see if the system works
print("\n🧪 Testing alert creation:")
try:
    test_alert = {
        "name": "Test Alert - Cleanup Test",
        "mode": "spot",
        "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # BIQ spot
        "origin_iata": "LIS",
        "dest_iata": "BIQ",
        "wave_min_m": 0.5,
        "wave_max_m": 2.0,
        "wind_max_kmh": 20,
        "max_price_eur": 500,
        "forecast_window": 5,
        "days_mask": 127,  # All days
        "cooldown_hours": 24,
        "is_active": True,
        "destination_iata": "BIQ",
        "planning_logic": "conservative"
    }
    
    result = supabase.table("alert_rules").insert(test_alert).execute()
    print(f"✅ Test alert created successfully! ID: {result.data[0]['id'][:8]}...")
    
    # Now check if we can see it
    result = supabase.table("alert_rules").select("*").execute()
    print(f"Total alerts after creation: {len(result.data)}")
    
except Exception as e:
    print(f"❌ Error creating test alert: {e}")

print("\n✅ API view check completed!")


