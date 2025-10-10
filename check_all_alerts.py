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

# Check all alerts (including inactive ones)
print("\n📊 All alerts (including inactive):")
try:
    result = supabase.table("alert_rules").select("*").execute()
    print(f"Found {len(result.data)} total alerts:")
    for alert in result.data:
        print(f"  - {alert.get('name', 'Unnamed')} (ID: {alert.get('id', 'Unknown')[:8]}...)")
        print(f"    Active: {alert.get('is_active', False)}")
        print(f"    Created: {alert.get('created_at', 'Unknown')}")
        print(f"    Min nights: {alert.get('min_nights', 'NULL')}")
        print(f"    Max nights: {alert.get('max_nights', 'NULL')}")
        print()
except Exception as e:
    print(f"Error fetching alerts: {e}")

# Check alert events
print("\n📊 Alert events:")
try:
    result = supabase.table("alert_events").select("*").order("sent_at", desc=True).limit(10).execute()
    print(f"Found {len(result.data)} recent events:")
    for event in result.data:
        print(f"  - Rule ID: {event.get('rule_id', 'Unknown')[:8]}...")
        print(f"    Status: {event.get('status', 'Unknown')}")
        print(f"    Sent: {event.get('sent_at', 'Unknown')}")
        print(f"    Reason: {event.get('reason', 'Unknown')}")
        print()
except Exception as e:
    print(f"Error fetching events: {e}")

# Check price cache
print("\n📊 Price cache:")
try:
    result = supabase.table("price_cache").select("*").limit(5).execute()
    print(f"Found {len(result.data)} price cache entries:")
    for cache in result.data:
        print(f"  - Spot ID: {cache.get('spot_id', 'Unknown')[:8]}...")
        print(f"    Price: {cache.get('price_eur', 'Unknown')} EUR")
        print(f"    Cached: {cache.get('cached_at', 'Unknown')}")
        print()
except Exception as e:
    print(f"Error fetching price cache: {e}")

print("\n✅ Database check completed!")


