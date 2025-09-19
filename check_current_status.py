import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('vercel-app/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Check current alert_rules
result = supabase.table('alert_rules').select('id,name').order('created_at', desc=True).limit(10).execute()
print('Current alert_rules:')
for rule in result.data:
    print(f'  {rule["id"]}: {rule["name"]}')

print('\nLatest alert_events:')
result2 = supabase.table('alert_events').select('*').order('sent_at', desc=True).limit(5).execute()
for event in result2.data:
    print(f'  {event["rule_id"]}: {event["status"]} - {event["ok_dates_count"]} days - {event["reason"]}')

