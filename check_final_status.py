import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('vercel-app/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Get the latest status for each rule
result = supabase.table('alert_events').select('rule_id,status,ok_dates_count,reason').order('sent_at', desc=True).execute()

# Group by rule_id to get the latest status for each rule
rule_status = {}
for event in result.data:
    rule_id = event['rule_id']
    if rule_id not in rule_status:
        rule_status[rule_id] = event

print('Latest status for each rule:')
for rule_id, event in rule_status.items():
    print(f'  {rule_id}: {event["status"]} - {event["ok_dates_count"]} days - {event["reason"]}')

