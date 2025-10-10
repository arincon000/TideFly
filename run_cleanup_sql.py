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

# Step 1: Check current alerts
print("\n📊 Current alerts:")
try:
    result = supabase.table("alert_rules").select("id, name, is_active, min_nights, max_nights").execute()
    print(f"Found {len(result.data)} alerts:")
    for alert in result.data:
        print(f"  - {alert.get('name', 'Unnamed')} (ID: {alert.get('id', 'Unknown')[:8]}...)")
        print(f"    Active: {alert.get('is_active', False)}")
        print(f"    Min nights: {alert.get('min_nights', 'NULL')}")
        print(f"    Max nights: {alert.get('max_nights', 'NULL')}")
        print()
except Exception as e:
    print(f"Error fetching alerts: {e}")

# Step 2: Check if columns exist
print("\n🔍 Checking if min_nights/max_nights columns exist...")
try:
    # Try to select from these columns
    result = supabase.table("alert_rules").select("min_nights, max_nights").limit(1).execute()
    print("✅ Columns exist and are accessible")
except Exception as e:
    print(f"❌ Columns don't exist or can't be accessed: {e}")

# Step 3: Check for dependencies (views)
print("\n🔍 Checking for view dependencies...")
try:
    # This is a simplified check - we'll run the actual SQL in Supabase
    print("Note: Full dependency check needs to be run in Supabase SQL editor")
except Exception as e:
    print(f"Error checking dependencies: {e}")

print("\n✅ Database connection test completed!")
print("Next step: Run the SQL cleanup script in Supabase SQL editor")


