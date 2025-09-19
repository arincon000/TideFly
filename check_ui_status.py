import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('vercel-app/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Check v1_rule_status view
result = supabase.table('api.v1_rule_status').select('*').execute()
print('v1_rule_status view:')
for status in result.data:
    print(f'  {status["rule_id"]}: {status["status"]} - {status["ok_dates_count"]} days')
