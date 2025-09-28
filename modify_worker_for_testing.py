import os
import sys
from datetime import datetime, timedelta
import pytz
import json

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append('vercel-app')

print("🔧 Modifying worker for email testing...")

# Read the current worker file
worker_file = "worker/worker.py"
with open(worker_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Add email testing configuration at the top
email_test_config = '''
# Email testing configuration
EMAIL_TEST_LIMIT = int(os.environ.get("EMAIL_TEST_LIMIT", "10"))  # Limit emails during testing
EMAIL_TEST_COUNT = 0  # Counter for emails sent
'''

# Find the email configuration section and add our test config
if "EMAIL_FROM = os.environ.get" in content:
    # Add after the email configuration
    content = content.replace(
        "EMAIL_FROM = os.environ.get(\"EMAIL_FROM\", \"alerts@tidefly.app\")",
        "EMAIL_FROM = os.environ.get(\"EMAIL_FROM\", \"alerts@tidefly.app\")\n" + email_test_config
    )
else:
    # Add at the top of the file
    content = email_test_config + "\n" + content

# Modify the send_email function to include testing limits
old_send_email = '''def send_email(to_email, subject, html):
    try:
        msg_id = send_email_resend(
            to_email=to_email,
            subject=subject,
            html=html,
        )
        return msg_id
    except Exception as e:
        print(f"[email] Error sending email to {to_email}: {e}")
        return None'''

new_send_email = '''def send_email(to_email, subject, html):
    global EMAIL_TEST_COUNT
    
    # Check if we've hit the email limit
    if EMAIL_TEST_COUNT >= EMAIL_TEST_LIMIT:
        print(f"[email] TESTING MODE: Email limit reached ({EMAIL_TEST_LIMIT}), skipping email to {to_email}")
        return "skipped_testing"
    
    try:
        EMAIL_TEST_COUNT += 1
        msg_id = send_email_resend(
            to_email=to_email,
            subject=subject,
            html=html,
        )
        print(f"[email] TESTING MODE: Email {EMAIL_TEST_COUNT}/{EMAIL_TEST_LIMIT} sent to {to_email}")
        return msg_id
    except Exception as e:
        print(f"[email] Error sending email to {to_email}: {e}")
        return None'''

# Replace the send_email function
if old_send_email in content:
    content = content.replace(old_send_email, new_send_email)
    print("✅ Modified send_email function for testing")
else:
    print("⚠️ Could not find send_email function to modify")

# Write the modified content back
with open(worker_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Worker modified for email testing!")
print(f"📧 Email limit set to: {os.environ.get('EMAIL_TEST_LIMIT', '10')}")
print("📧 Only the first 10 alerts will send emails")
print("📧 All 108 alerts will still be processed for testing")
