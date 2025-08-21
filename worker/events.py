from typing import Any, Dict
from worker.utils import to_json_number


def log_event(supabase, *, rule_id: str, status: str,
              price=None, ok_dates_count=None, tier=None, reason=None, **extra):
    payload: Dict[str, Any] = {
        "rule_id": rule_id,
        "status": status,
        "price": to_json_number(price) if price is not None else None,
        "ok_dates_count": ok_dates_count,
        "tier": tier,
        "reason": reason,
    }
    payload.update(extra)
    # strip None
    payload = {k: v for k, v in payload.items() if v is not None}
    try:
        supabase.table("alert_events").insert(payload).execute()
        print(f"[log_event] inserted status={status} rule_id={rule_id}")
    except Exception as e:
        print(f"[log_event] insert failed rule_id={rule_id} status={status}: {e}")
