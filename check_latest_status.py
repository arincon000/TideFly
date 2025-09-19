import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('vercel-app/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Check latest alert_events
result = supabase.table('alert_events').select('*').order('sent_at', desc=True).limit(5).execute()
print('Latest alert_events:')
for event in result.data:
    print(f'  {event["rule_id"]}: {event["status"]} - {event["ok_dates_count"]} days - {event["reason"]}')

print('\nChecking v1_rule_status view:')
try:
    result2 = supabase.table('api.v1_rule_status').select('*').execute()
    for status in result2.data:
        print(f'  {status["rule_id"]}: {status["status"]} - {status["ok_dates_count"]} days')
except Exception as e:
    print(f'  Error checking v1_rule_status: {e}')
