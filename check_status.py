import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Check alert_events table
result = supabase.table('alert_events').select('*').order('sent_at', desc=True).limit(10).execute()
print('Recent alert_events:')
for event in result.data:
    print(f'  {event["rule_id"]}: {event["status"]} - {event["ok_dates_count"]} days - {event["reason"]}')

print('\nChecking v1_rule_status view:')
result2 = supabase.schema('api').table('v1_rule_status').select('*').execute()
for status in result2.data:
    print(f'  {status["rule_id"]}: {status["status"]} - {status["ok_dates_count"]} days')

