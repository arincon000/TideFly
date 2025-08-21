from datetime import datetime, timezone
import pandas as pd

def load_recent_forecast_from_cache(sb_select_fn, spot_id: str,
                                    preferred_max_age_hours: int = 6,
                                    hard_max_age_hours: int = 12):
    """Return the latest cached forecast for ``spot_id`` if recent enough.

    The function queries ``public.forecast_cache`` ordering by ``cached_at``
    descending and limiting to the most recent row.  The age of that cache
    snapshot determines whether it can be used:

    * ``age <= preferred_max_age_hours``  -> ``cache_fresh``
    * ``age <= hard_max_age_hours``       -> ``cache_stale_ok``
    * otherwise ``None`` is returned

    The return value is a tuple ``(DataFrame, source)`` where ``source`` is the
    cache state as above.  If no suitable cache exists ``(None, None)`` is
    returned.
    """

    try:
        latest = sb_select_fn(
            "forecast_cache",
            params={
                "spot_id": f"eq.{spot_id}",
                "order": "cached_at.desc",
                "limit": "1",
            },
            select="date,wave_stats,wind_stats,cached_at",
        )
    except Exception as e:
        print(f"[cache] load error spot_id={spot_id}: {e}")
        return None, None

    if not latest:
        return None, None

    row0 = latest[0]
    cached_at_raw = row0.get("cached_at")
    try:
        cached_at = datetime.fromisoformat(str(cached_at_raw).replace("Z", "+00:00"))
    except Exception:
        return None, None

    now = datetime.now(timezone.utc)
    age_hours = (now - cached_at).total_seconds() / 3600.0
    if age_hours > hard_max_age_hours:
        print(f"[cache] spot_id={spot_id} cache_too_old age_h={age_hours:.2f}")
        return None, None

    state = "cache_fresh" if age_hours <= preferred_max_age_hours else "cache_stale_ok"

    # Fetch all rows with the same cached_at timestamp so the caller gets the
    # complete forecast snapshot.
    try:
        rows = sb_select_fn(
            "forecast_cache",
            params={
                "spot_id": f"eq.{spot_id}",
                "cached_at": f"eq.{cached_at.isoformat()}",
            },
            select="date,wave_stats,wind_stats",
        )
    except Exception as e:
        print(f"[cache] load rows error spot_id={spot_id}: {e}")
        return None, None

    if not rows:
        return None, None

    df_rows = []
    for r in rows:
        wave = r.get("wave_stats") or {}
        wind = r.get("wind_stats") or {}
        try:
            df_rows.append(
                {
                    "date": pd.to_datetime(str(r.get("date"))).normalize(),
                    "min_wave": float(wave.get("min", 0)),
                    "max_wave": float(wave.get("max", 0)),
                    "avg_wave": float(wave.get("avg", 0)),
                    "min_wind": float(wind.get("min", 0)),
                    "max_wind": float(wind.get("max", 0)),
                    "avg_wind": float(wind.get("avg", 0)),
                }
            )
        except Exception:
            continue

    if not df_rows:
        return None, None

    print(f"[cache] spot_id={spot_id} {state} age_h={age_hours:.2f} rows={len(df_rows)}")
    return pd.DataFrame(df_rows), state
