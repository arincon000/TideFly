import os
import pathlib
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(pathlib.Path(__file__).resolve().parent / "vercel-app" / ".env.local")

# Test database connection
try:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Missing Supabase credentials")
        print(f"SUPABASE_URL: {'SET' if url else 'NOT SET'}")
        print(f"SUPABASE_ANON_KEY: {'SET' if key else 'NOT SET'}")
        exit(1)
    
    print("🔗 Connecting to Supabase...")
    supabase: Client = create_client(url, key)
    
    # Test connection by fetching alert rules
    print("📊 Testing connection by fetching alert rules...")
    result = supabase.table("alert_rules").select("id, name, is_active").limit(5).execute()
    
    print(f"✅ Connection successful! Found {len(result.data)} alerts:")
    for alert in result.data:
        print(f"  - {alert.get('name', 'Unnamed')} (ID: {alert.get('id', 'Unknown')[:8]}...)")
    
    # Check current table structure
    print("\n📋 Current table structure:")
    result = supabase.rpc('get_table_columns', {'table_name': 'alert_rules'}).execute()
    if result.data:
        for col in result.data:
            print(f"  - {col.get('column_name', 'Unknown')}: {col.get('data_type', 'Unknown')}")
    else:
        print("  (Could not fetch table structure via RPC)")
    
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    exit(1)
