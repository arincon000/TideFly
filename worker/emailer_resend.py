# worker/emailer_resend.py
import os
import json
import requests
from typing import Optional

RESEND_API_KEY = os.getenv("RESEND_API_KEY")

def send_email_resend(
    to_email: str,
    subject: str,
    html: str,
    dry_run: bool = False,
) -> Optional[str]:
    """
    Sends an email via Resend using direct HTTP calls for verbose error reporting.
    Returns message id on success.
    When dry_run=True, just log and return None.
    """
    if dry_run:
        print(f"[dry-run email] to={to_email} :: {subject}")
        return None

    if not RESEND_API_KEY:
        print("[email] error via Resend: RESEND_API_KEY missing")
        return None

    from_email = os.getenv("EMAIL_FROM")
    if not from_email:
        print("[email] error via Resend: EMAIL_FROM missing")
        return None

    # Format the from address with display name
    from_header = f"TideFly Surf Alerts <{from_email}>"
    
    # Log provider and addresses
    print(f"[email] provider=Resend from={from_email} to={to_email}")

    payload = {"from": from_header, "to": [to_email], "subject": subject, "html": html}

    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            data=json.dumps(payload), 
            timeout=30,
        )
        if 200 <= r.status_code < 300:
            print(f"[email] sent via Resend: {r.text}")
            # Try to extract ID from response
            try:
                response_data = json.loads(r.text)
                return response_data.get("id")
            except:
                return None
        else:
            print(f"[resend] status={r.status_code} body={r.text}")
            print("[email] error via Resend: " + (r.text or "Resend send failed"))
            return None
    except Exception as e:
        print(f"[email] error via Resend: {e}")
        return None
