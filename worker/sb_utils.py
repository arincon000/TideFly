# worker/sb_utils.py
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
API_SCHEMA = os.getenv("SUPABASE_API_SCHEMA", "api")

# Create main client for public schema
sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Create a separate client for API schema
api_sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
api_sb.schema = API_SCHEMA

def api_table(name: str):
    """
    Return a PostgREST query builder for a table in the API schema.
    Usage: api_table("v1_alert_rules").select("*").execute()
    """
    # Use the API schema client
    return api_sb.from_(name)

# Optional conveniences if the code uses .rpc or storage, extend only if needed later:
def api_rpc(fn: str, params: dict):
    # supabase-py v2 rpc doesn't take schema kwarg; PostgREST side respects server defaults.
    # If we ever need schema-specific RPC, we can wire via sb.postgrest.
    return sb.rpc(fn, params)
