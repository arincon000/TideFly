import os, json, hashlib
from datetime import datetime, timedelta, date, timezone
import requests, pandas as pd
import time
import re
from decimal import Decimal
import pathlib
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(pathlib.Path(__file__).resolve().parents[1] / ".env.local", override=False)

from supabase import create_client, Client
from .net import get as http_get
from .utils import call_with_budget, as_money
from .events import log_event
from .db import load_recent_forecast_from_cache

def _is_iata(x: str) -> bool:
    return bool(re.fullmatch(r"[A-Z]{3}", (x or "")))

def _with_backoff(fn, *a, **kw):
    """Retry on 429 or transient request errors with exponential backoff: 1s, 2s, 4s (3 tries)."""
    for i in range(3):
        try:
            r = fn(*a, **kw)
        except requests.RequestException as e:
            # last try: re-raise so callers can see the real error
            if i == 2:
                raise
            time.sleep(2 ** i)
            continue
        # if not rate-limited, or we've exhausted retries, return the response
        if r.status_code != 429 or i == 2:
            return r
        time.sleep(2 ** i)
    return r

# --- ENV ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
# Email configuration
EMAIL_FROM = os.environ.get("EMAIL_FROM", "alerts@tidefly.app")
AMADEUS_CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
AMADEUS_CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")
AMADEUS_ENV = (os.environ.get("AMADEUS_ENV") or "test").lower()  # "test" or "prod"
AMADEUS_BASE = "https://api.amadeus.com" if AMADEUS_ENV == "prod" else "https://test.api.amadeus.com"

# Fake price configuration
AMADEUS_MODE = (os.environ.get("AMADEUS_MODE") or "api").lower()  # "api" | "fake"
AMADEUS_FAKE_PRICE = os.environ.get("AMADEUS_FAKE_PRICE", "137")

# Email testing configuration
EMAIL_TEST_LIMIT = int(os.environ.get("EMAIL_TEST_LIMIT", "10"))  # Limit emails during testing
EMAIL_TEST_COUNT = 0  # Counter for emails sent

# --- Email (Resend) ---
from .emailer_resend import send_email_resend

def send_email(to_email, subject, html):
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
        return None

# Rest of the worker code would go here...
# (This is just the email modification part)

print(f"📧 Email testing mode enabled: Max {EMAIL_TEST_LIMIT} emails will be sent")
print(f"📧 Remaining emails: {EMAIL_TEST_LIMIT - EMAIL_TEST_COUNT}")
