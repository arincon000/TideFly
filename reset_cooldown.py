import os
from supabase import create_client, Client
from datetime import datetime, timezone

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_ANON_KEY')
supabase: Client = create_client(url, key)

# Get all test alerts
result = supabase.table('alert_rules').select('id, name, cooldown_hours, last_checked_at').execute()

print('Current alert cooldown status:')
for alert in result.data:
    print(f"ID: {alert['id'][:8]}... Name: {alert['name']} Cooldown: {alert['cooldown_hours']}h Last checked: {alert['last_checked_at']}")

print(f'\nFound {len(result.data)} alerts')

# Reset cooldown for all alerts by setting last_checked_at to None
print('\nResetting cooldown for all alerts...')
update_result = supabase.table('alert_rules').update({'last_checked_at': None}).execute()

print(f'Updated {len(update_result.data)} alerts - they are now eligible for worker processing')
