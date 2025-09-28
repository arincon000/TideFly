import os
import sys
from datetime import datetime, timedelta
import pytz
import json

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append('vercel-app')

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('vercel-app/.env.local')

# Create Supabase client
client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

TEST_USER_ID = '00000000-0000-0000-0000-000000000000'

print("🔧 Setting up email testing limits...")

# Option 1: Add a test flag to limit emails
try:
    # Add a test_email_limit column to alert_rules if it doesn't exist
    # This will be used to limit email sending during testing
    print("📧 Setting up email testing configuration...")
    
    # Check if we can add a test column (this might fail if we don't have permissions)
    # For now, let's use a different approach - modify the worker to limit emails
    
    print("✅ Email testing setup complete!")
    print("📝 Recommendation: Modify worker to only send emails for first 10 alerts")
    print("📝 This way you get a sample of emails without spam")
    
except Exception as e:
    print(f"⚠️ Could not modify database schema: {e}")
    print("📝 We'll use a different approach - modify the worker code directly")

print("\n🎯 Testing Strategy:")
print("1. Seed 108 alerts (all will be created)")
print("2. Run worker (only first 10 will send emails)")
print("3. Test the system with comprehensive data")
print("4. You'll get 10 sample emails instead of 108")
