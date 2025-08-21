from datetime import datetime, timedelta, timezone
import pandas as pd


def load_recent_forecast_from_cache(sb_select_fn, spot_id, max_age_hours=12):
    """Load cached forecast rows for a spot if newer than ``max_age_hours``.

    Returns a DataFrame compatible with the live fetch output or ``None`` if
    unavailable.
    """
    since = (datetime.now(timezone.utc) - timedelta(hours=max_age_hours)).isoformat()
    try:
        rows = sb_select_fn(
            "forecast_cache",
            params={
                "spot_id": f"eq.{spot_id}",
                "inserted_at": f"gt.{since}",
            },
            select="date,wave_stats,wind_stats",
        )
    except Exception as e:
        print(f"[cache] load error spot_id={spot_id}: {e}")
        return None

    if not rows:
        return None

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
        return None

    return pd.DataFrame(df_rows)
