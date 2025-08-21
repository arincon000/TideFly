import hashlib
import json
from typing import Any, Dict, Iterable, Optional

from worker.utils import to_json_number  # absolute import


def make_summary_hash(
    *,
    rule_id: str,
    status: str,
    ok_dates: Optional[Iterable[str]] = None,
    price: Optional[float] = None,
    deep_link: Optional[str] = None,
    version: str = "v2",
) -> str:
    """Deterministic summary hash for non-sent outcomes and fallback."""
    payload = {
        "v": version,
        "rule_id": rule_id,
        "status": status,
        "ok_dates": sorted(list(ok_dates or [])),
        "price": to_json_number(price),
        "deep_link": deep_link or "",
    }
    s = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def log_event(
    supabase,
    *,
    rule_id: str,
    status: str,
    price: Optional[float] = None,
    ok_dates_count: Optional[int] = None,
    tier: Optional[str] = None,
    reason: Optional[str] = None,
    deep_link: Optional[str] = None,
    ok_dates: Optional[Iterable[str]] = None,
    summary_hash: Optional[str] = None,
) -> None:
    """Insert/update public.alert_events with robust payload.

    - `tier` falls back to 'info' to satisfy NOT NULL.
    - `summary_hash` is required; generate if not provided.
    - Upsert on (rule_id, summary_hash) to avoid duplicate-key errors.
    """
    if summary_hash is None:
        summary_hash = make_summary_hash(
            rule_id=rule_id, status=status, ok_dates=ok_dates, price=price, deep_link=deep_link
        )

    safe_tier = tier or "info"

    payload: Dict[str, Any] = {
        "rule_id": rule_id,
        "summary_hash": summary_hash,
        "status": status,  # uses existing column
        "price": to_json_number(price) if price is not None else None,
        "ok_dates_count": ok_dates_count,
        "tier": safe_tier,
        "reason": reason,
        "deep_link": deep_link,
        "ok_dates": list(ok_dates) if ok_dates is not None else None,
        # sent_at is DB-managed (default now()); do not set here
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        supabase.table("alert_events").upsert(
            payload,
            on_conflict="rule_id,summary_hash",
        ).execute()
        print(f"[log_event] upserted status={status} rule_id={rule_id}")
    except Exception as e:
        print(f"[log_event] upsert failed rule_id={rule_id} status={status}: {e}")

