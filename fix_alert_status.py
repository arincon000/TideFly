import os
import sys
sys.path.append('vercel-app')
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('vercel-app/.env.local')
client = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# Clear alert events for this specific rule to reset deduplication
rule_id = '9f04e02d-4626-4826-8fba-92931c44de47'
result = client.table('alert_events').delete().eq('rule_id', rule_id).execute()
print(f'Cleared {len(result.data) if result.data else 0} alert events for rule {rule_id}')

# Reset last_checked_at to make it eligible for processing again
result2 = client.table('alert_rules').update({'last_checked_at': None}).eq('id', rule_id).execute()
print(f'Reset last_checked_at for rule {rule_id}: {result2.data}')

print("✅ Alert is now ready to be processed again!")
