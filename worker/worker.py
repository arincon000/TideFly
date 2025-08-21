import os, json, hashlib
from datetime import datetime, timedelta, date, timezone
import requests, pandas as pd
import time
import re
from decimal import Decimal

from supabase import create_client, Client
from worker.net import get as http_get
from worker.utils import call_with_budget, as_money
from worker.events import log_event
from worker.db import load_recent_forecast_from_cache

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
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
AMADEUS_CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
AMADEUS_CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")
AMADEUS_ENV = (os.environ.get("AMADEUS_ENV") or "test").lower()  # "test" or "prod"
AMADEUS_BASE = "https://api.amadeus.com" if AMADEUS_ENV == "prod" else "https://test.api.amadeus.com"


HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

def require_env(name):
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v

# --- Supabase helpers ---
def _split_profile(table: str):
    """Return (schema, path) where schema may be None if unqualified."""
    if "." in table:
        schema, rel = table.split(".", 1)
        return schema, rel
    return None, table

def sb_select(table, params=None, select="*"):
    schema, path = _split_profile(table)
    headers = HEADERS.copy()
    if schema:
        headers["Accept-Profile"] = schema
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    q = {"select": select}
    if params:
        q.update(params)
    r = _with_backoff(requests.get, url, headers=headers, params=q, timeout=60)
    r.raise_for_status()
    return r.json()

def sb_upsert(table, rows, on_conflict=None):
    schema, path = _split_profile(table)
    headers = HEADERS.copy()
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    if schema:
        headers["Content-Profile"] = schema
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    params = {"on_conflict": on_conflict} if on_conflict else None
    r = _with_backoff(requests.post, url, headers=headers, params=params, data=json.dumps(rows), timeout=60)
    r.raise_for_status()
    return r.json()

def sb_insert(table, row):
    schema, path = _split_profile(table)
    headers = HEADERS.copy()
    headers["Prefer"] = "return=representation"
    if schema:
        headers["Content-Profile"] = schema
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    r = _with_backoff(requests.post, url, headers=headers, data=json.dumps(row), timeout=60)
    r.raise_for_status()
    return r.json()

# --- Money & event helpers ---
DEFAULT_MAX_PRICE_EUR = Decimal("300.00")


"""Utilities for fetching forecasts."""

# --- Forecast (Open-Meteo; no API key) ---
def fetch_wave_wind_stats(lat, lon, tz_name, hours, forecast_days=5):
    """Return aggregated wave and wind stats for the given spot.

    Two separate Open-Meteo endpoints are queried: the Marine API for wave
    heights and the Weather API for 10 m wind speed.  The hourly series are
    merged by timestamp prior to aggregation.

    Returns a tuple ``(DataFrame, merged_hour_count)`` where the DataFrame has
    daily aggregates expected by callers.  On error ``(None, 0)`` is returned.
    """

    forecast_days = min(forecast_days, 10)

    marine_url = "https://marine-api.open-meteo.com/v1/marine"
    marine_params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wave_height",
        "forecast_days": forecast_days,
        "past_days": 0,
        "timezone": tz_name,
    }

    weather_url = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wind_speed_10m",
        "wind_speed_unit": "kmh",
        "forecast_days": forecast_days,
        "past_days": 0,
        "timezone": tz_name,
    }

    def _marine():
        start = time.time()
        r = http_get(marine_url, params=marine_params, timeout=(8, 20))
        data = r.json() or {}
        h = data.get("hourly") or {}
        times = h.get("time") or []
        waves = h.get("wave_height") or []
        elapsed = time.time() - start
        print(f"[marine] hours={len(times)} in {elapsed:.2f}s")
        return times, waves

    def _weather():
        start = time.time()
        r = http_get(weather_url, params=weather_params, timeout=(8, 20))
        data = r.json() or {}
        h = data.get("hourly") or {}
        times = h.get("time") or []
        winds = h.get("wind_speed_10m") or []
        elapsed = time.time() - start
        print(f"[weather] hours={len(times)} in {elapsed:.2f}s")
        return times, winds

    m = call_with_budget(_marine, budget_seconds=35)
    w = call_with_budget(_weather, budget_seconds=35)
    if m is None or w is None:
        return None, 0

    m_times, m_waves = m
    w_times, w_winds = w
    waves_hourly = {t: float(w) if w is not None else None for t, w in zip(m_times, m_waves)}
    wind_hourly = {t: float(w) if w is not None else None for t, w in zip(w_times, w_winds)}

    merged = {}
    for t in set(list(waves_hourly.keys()) + list(wind_hourly.keys())):
        merged[t] = {
            "wave_height": waves_hourly.get(t),
            "wind_speed_10m": wind_hourly.get(t),
        }

    print(f"[merge] merged_hours={len(merged)}")
    if not merged:
        return None, 0

    df = pd.DataFrame([
        {
            "time": pd.to_datetime(ts, errors="coerce"),
            "wave": v["wave_height"],
            "wind": v["wind_speed_10m"],
        }
        for ts, v in merged.items()
    ])
    df = df.dropna(subset=["time"])
    df["date"] = df["time"].dt.normalize()
    df["hour"] = df["time"].dt.hour
    df = df[df["hour"].isin(hours)]
    if df.empty:
        return None, len(merged)

    agg = df.groupby("date").agg(
        min_wave=("wave", "min"),
        max_wave=("wave", "max"),
        avg_wave=("wave", "mean"),
        min_wind=("wind", "min"),
        max_wind=("wind", "max"),
        avg_wind=("wind", "mean"),
    ).reset_index()
    return agg, len(merged)

# --- Flights (Amadeus) ---
_token = {"access_token": None, "exp": 0}

def _amadeus_token():
    # Reuse cached token if still valid (60s buffer)
    if _token["access_token"] and time.time() < _token["exp"] - 60:
        return _token["access_token"]

    print("[amadeus] fetching new token...")
    r = _with_backoff(
        requests.post,
        f"{AMADEUS_BASE}/v1/security/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": AMADEUS_CLIENT_ID,
            "client_secret": AMADEUS_CLIENT_SECRET,
        },
        timeout=60,
    )

    # If we still got rate-limited after backoff attempts, surface it clearly
    if r.status_code == 429:
        raise RuntimeError("Amadeus rate limit when fetching OAuth token")

    r.raise_for_status()
    d = r.json() or {}

    # Cache token and expiry (fallback to 1800s if missing)
    expires_in = int(d.get("expires_in", 1800))
    _token["access_token"] = d["access_token"]
    _token["exp"] = time.time() + expires_in

    print("[amadeus] token ok; expires_in:", expires_in)
    return _token["access_token"]


def build_travel_links(o, d, dep, ret, currency="EUR"):
    # Dates
    dep_s = dep.strftime("%Y-%m-%d")
    ret_s = ret.strftime("%Y-%m-%d")
    dep_y = dep.strftime("%Y"); dep_m = dep.strftime("%m"); dep_d = dep.strftime("%d")
    ret_y = ret.strftime("%Y"); ret_m = ret.strftime("%m"); ret_d = ret.strftime("%d")
    dep_yymmdd = dep.strftime("%y%m%d")
    ret_yymmdd = ret.strftime("%y%m%d")

    # Google (query form – robust with tracking/locales)
    google = (
        "https://www.google.com/travel/flights?hl=en&q="
        + requests.utils.quote(f"{o} to {d} {dep_s} to {ret_s}")
    )

    # Kayak (very reliable deep link)
    kayak = (
    "https://www.kayak.com/flights/"
    f"{o}-{d}/{dep_y}-{dep_m}-{dep_d}/{ret_y}-{ret_m}-{ret_d}?adults=1&sort=bestflight_a"
    )


    # Skyscanner
    skyscanner = (
        "https://www.skyscanner.net/transport/flights/"
        f"{o.lower()}/{d.lower()}/{dep_yymmdd}/{ret_yymmdd}/?adults=1&cabinclass=economy"
    )

    # Kiwi
    kiwi = (
        "https://www.kiwi.com/en/search/results/"
        f"{o}/{d}/{dep_y}-{dep_m}-{dep_d}/{ret_y}-{ret_m}-{ret_d}?adults=1"
    )

    return {"primary": "kayak", "google": google, "kayak": kayak, "skyscanner": skyscanner, "kiwi": kiwi}

def _amadeus_reprice(offer, currency="EUR"):
    """
    Confirm the final price (grandTotal) for a flight offer from Flight Offers Search.
    Works in both test and prod.
    """
    token = _amadeus_token()
    # Use a deep copy so we don't mutate the original
    offer_copy = json.loads(json.dumps(offer))

    url = f"{AMADEUS_BASE}/v1/shopping/flight-offers/pricing"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "data": {
            "type": "flight-offers-pricing",
            "flightOffers": [offer_copy],
            "currencyCode": currency,
        }
    }

    # Call with backoff to handle transient 429s
    r = _with_backoff(requests.post, url, headers=headers, data=json.dumps(payload), timeout=60)

    # Refresh once on token expiry, retry with backoff
    if r.status_code == 401:
        _token["access_token"] = None
        headers["Authorization"] = f"Bearer {_amadeus_token()}"
        r = _with_backoff(requests.post, url, headers=headers, data=json.dumps(payload), timeout=60)

    # If still rate-limited after backoff attempts, surface clearly
    if r.status_code == 429:
        raise RuntimeError("Amadeus rate limit on pricing")

    r.raise_for_status()
    body = r.json() or {}
    flights = (body.get("data") or {}).get("flightOffers") or []
    if not flights:
        raise RuntimeError(f"Pricing returned no offers: {body}")

    priced = flights[0]
    grand = (priced.get("price") or {}).get("grandTotal")
    if grand is None:
        raise RuntimeError(f"No grandTotal in pricing response: {priced}")

    return float(grand)


def _amadeus_search_roundtrip(origin, dest, depart_dt, return_dt, currency="EUR"):
    print(f"[amadeus] search {origin}->{dest} {depart_dt} .. {return_dt}")
    token = _amadeus_token()
    params = {
        "originLocationCode": origin,
        "destinationLocationCode": dest,
        "departureDate": depart_dt.strftime("%Y-%m-%d"),
        "returnDate": return_dt.strftime("%Y-%m-%d"),
        "adults": 1,
        "currencyCode": currency,
        "nonStop": "false",
        "max": 10,
    }
    h = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    r = _with_backoff(
        requests.get,
        f"{AMADEUS_BASE}/v2/shopping/flight-offers",
        headers=h, params=params, timeout=60
    )   
    if r.status_code == 401:
        print("[amadeus] 401 once; retrying with fresh token...")
        _token["access_token"] = None
        h["Authorization"] = f"Bearer {_amadeus_token()}"
        r = _with_backoff(
            requests.get,
            f"{AMADEUS_BASE}/v2/shopping/flight-offers",
            headers=h, params=params, timeout=60
        )
    if r.status_code == 429:
        print("[amadeus] 429 rate limited; skipping this pair")
        return None
    try:
        r.raise_for_status()
    except requests.HTTPError as e:
        print("[amadeus] HTTP error:", e, "body:", r.text[:400])
        return None

    data = r.json().get("data") or []
    print(f"[amadeus] offers: {len(data)}")
    if not data:
        return None

    # keep only offers with numeric price.total
    def _total(o):
        try:
            return float(o.get("price", {}).get("total"))
        except Exception:
            return float("inf")

    best = min(data, key=_total)
    search_price = _total(best)
    if not (search_price < float("inf")):
        print("[amadeus] no valid totals in offers")
        return None

    # Confirm the final total
    try:
        price = _amadeus_reprice(best, currency=currency)
        print(f"[amadeus] repriced (grandTotal): {price}")
    except Exception as e:
        print("[amadeus] repricing failed; falling back to search price:", e)
        price = search_price
    print(f"[amadeus] best price: {price}")

    links = build_travel_links(origin, dest, depart_dt, return_dt, currency=currency)
    deep = links.get(links["primary"], links["kayak"])  # prefer kayak

    return {
        "price": float(price),
        "deep_link": deep,
        "departure_date": depart_dt.strftime("%Y-%m-%d"),
        "return_date": return_dt.strftime("%Y-%m-%d"),
        "links": links,
    }


# --- Flights (Amadeus) ---
def amadeus_cheapest_roundtrip(fly_from, fly_to, date_from, date_to, min_n=2, max_n=5, currency="EUR"):
    """
    Scan a small grid of depart dates in [date_from, date_to] and stay lengths [min_n, max_n].
    Returns {'price': float, 'deep_link': str, 'departure_date': 'YYYY-MM-DD'} or None.
    """
    if not (AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET):
        return None

    # iterate dates (be mindful of rate limits on the free plan)
    days = (date_to - date_from).days
    depart_candidates = [date_from + timedelta(days=i) for i in range(max(0, days) + 1)]
    # sample durations (min, mid, max) to keep requests low
    stay_candidates = sorted({min_n, max((min_n + max_n) // 2, min_n), max_n})

    best = None
    for dep in depart_candidates:
        # micro-optimization: if even the shortest stay returns after the window, skip this dep
        if dep + timedelta(days=min_n) > date_to:
            continue

        for n in stay_candidates:
            ret = dep + timedelta(days=n)
            if ret > date_to:
                continue

            offer = _amadeus_search_roundtrip(fly_from, fly_to, dep, ret, currency=currency)
            if not offer:
                continue

            if not best or offer["price"] < best["price"]:
                best = offer

    return best

# --- Email (SendGrid) ---
def send_email(to_email, subject, html):
    if not SENDGRID_API_KEY:
        print(f"[dry-run email] {subject}\n{html[:200]}...")
        return 200
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    sender = os.environ.get("EMAIL_FROM", "alerts@example.com")
    resp = SendGridAPIClient(SENDGRID_API_KEY).send(Mail(from_email=sender, to_emails=to_email, subject=subject, html_content=html))
    return resp.status_code

def sha(s): return hashlib.sha256(s.encode()).hexdigest()

def weekday_mask_ok(d: date, mask: int) -> bool:
    """Return True if date d (Mon=0..Sun=6) is enabled by the bitmask."""
    # bit 0 = Monday, bit 6 = Sunday
    return ((mask >> d.weekday()) & 1) == 1

def tier_for_days_out(days_out: int) -> str:
    if days_out <= 3:  return "confident"   # 0–3 days
    if days_out <= 5:  return "trend"       # 4–5 days
    if days_out <= 7:  return "early"       # 6–7 days
    return "watch"                            # 8–10+ days
def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--spot", type=int, help="run a single spot and exit")
    args = parser.parse_args()

    have_amadeus = bool(os.environ.get("AMADEUS_CLIENT_ID") and os.environ.get("AMADEUS_CLIENT_SECRET"))
    print(f"[worker] start (amadeus={'on' if have_amadeus else 'off'})")

    # Ensure required environment is present (fail fast)
    require_env("SUPABASE_URL")
    require_env("SUPABASE_SERVICE_KEY")
    # Optional:
    # require_env("SENDGRID_API_KEY"); require_env("AMADEUS_CLIENT_ID"); require_env("AMADEUS_CLIENT_SECRET")
    
    # Rehydrate globals from the (now-validated) environment
    global SUPABASE_URL, SUPABASE_SERVICE_KEY, HEADERS
    SUPABASE_URL = os.environ["SUPABASE_URL"]
    SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
    HEADERS = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    # === NEW: load active alert rules (replaces user_spot_prefs path) ===
    rules = sb_select(
        "api.v1_alert_rules",
        params={"is_active": "eq.true"},
        select=("id,user_id,name,mode,spot_id,regions,origin_iata,dest_iata,"
                "min_wave_m,max_wind_kmh,min_nights,max_nights,max_price_eur,"
                "forecast_window,days_mask,date_from,date_to,cooldown_hours,"
                "paused_until,expires_at")
    )
    print("[worker] active rules:", len(rules))
    if not rules:
        print("No active alert rules."); return

    now = datetime.now(timezone.utc)   # timezone-aware UTC
    today_d = now.date()

    def _rule_enabled(r):
        # paused?
        pu = r.get("paused_until")
        if pu:
            try:
                pu_dt = datetime.fromisoformat(str(pu).replace("Z", "+00:00"))
                if pu_dt.tzinfo is None:
                    pu_dt = pu_dt.replace(tzinfo=timezone.utc)
                if pu_dt > now:
                    return False
            except Exception:
                # if parse fails, ignore pause rather than block
                pass
    
        # expired?
        ex = r.get("expires_at")
        if ex:
            try:
                # robust date-only comparison (handles timestamps or dates)
                ex_d = pd.to_datetime(str(ex)).date()
                if ex_d < now.date():
                    return False
            except Exception:
                pass
    
        return True


    rules = [r for r in rules if _rule_enabled(r)]
    if not rules:
        print("All rules paused or expired."); return

    # Preload users referenced by rules
    user_ids = sorted({r["user_id"] for r in rules})
    users = {}
    for uid in user_ids:
        u = sb_select("users", params={"id": "eq."+uid}, select="id,email,home_airport")
        if u: users[uid] = u[0]

    # Preload spots referenced by rules (spot-mode)
    spot_ids = sorted({r["spot_id"] for r in rules if r.get("mode") == "spot" and r.get("spot_id")})
    spots = {}
    for sid in spot_ids:
        s = sb_select("api.v1_spots", params={"id": "eq."+sid}, select="id,name,latitude,longitude,timezone,nearest_airport_iata")
        if s: spots[sid] = s[0]

    # Maximum forecast window per spot (for minimal API fetch)
    spot_window_days = {}
    for r in rules:
        if r.get("mode") == "spot" and r.get("spot_id"):
            sid = r["spot_id"]
            w = int(r.get("forecast_window") or 5)
            spot_window_days[sid] = max(spot_window_days.get(sid, 0), w)

    # Cache merged forecast per-spot so we compute it once per worker run
    forecast_cache_mem = {}

    def _merged_forecast_for_spot(spot):
        sid = spot["id"]
        if sid in forecast_cache_mem:
            return forecast_cache_mem[sid]

        hours = [6, 7, 8, 9, 10, 11, 12]
        forecast_days = min(spot_window_days.get(sid, 5), 10)
        tz = spot.get("timezone") or "UTC"

        merged = None
        merged_hours = 0
        try:
            merged, merged_hours = fetch_wave_wind_stats(
                spot["latitude"], spot["longitude"], tz, hours, forecast_days=forecast_days
            )
        except Exception as e:
            print(f"[forecast] skipped spot_id={sid} reason={e}")
            merged = None

        source = "live"
        if merged is None or merged.empty:
            cache_df, cache_state = load_recent_forecast_from_cache(sb_select, sid)
            if cache_df is None:
                print(f"[spot] {spot['name']} forecast unavailable; skipping")
                forecast_cache_mem[sid] = (pd.DataFrame(), "unavailable", merged_hours)
                return forecast_cache_mem[sid]
            merged = cache_df
            source = cache_state
            merged_hours = 0
        else:
            cache_rows = []
            for _, r in merged.iterrows():
                cache_rows.append({
                    "spot_id": sid,
                    "date": str(r["date"].date()),
                    "morning_ok": False,
                    "wave_stats": {
                        "min": float(r["min_wave"]),
                        "max": float(r["max_wave"]),
                        "avg": float(r["avg_wave"]),
                    },
                    "wind_stats": {
                        "min": float(r["min_wind"]),
                        "max": float(r["max_wind"]),
                        "avg": float(r["avg_wind"]),
                    },
                })
            if cache_rows:
                try:
                    sb_upsert("forecast_cache", cache_rows, on_conflict="spot_id,date")
                except Exception as e:
                    print("forecast_cache upsert error:", e)

        print(f"[spot] {spot['name']} (id={sid}) rows={len(merged)} source={source}")
        forecast_cache_mem[sid] = (merged, source, merged_hours)
        return forecast_cache_mem[sid]

    # Dry run for a single spot
    if args.spot:
        sid = str(args.spot)
        spot = spots.get(sid)
        if not spot:
            s = sb_select("api.v1_spots", params={"id": "eq."+sid}, select="id,name,latitude,longitude,timezone,nearest_airport_iata")
            if not s:
                print(f"[dry-run] spot {sid} not found")
                return
            spot = s[0]
        start_t = time.time()
        merged, source, merged_hours = _merged_forecast_for_spot(spot)
        elapsed = time.time() - start_t
        print(f"[dry-run] spot_id={sid} source={source} elapsed={elapsed:.2f}s merged_hours={merged_hours}")
        return

    # Iterate rules
    for rule in rules:
        user = users.get(rule["user_id"])
        if not user:
            print(f"[rule] {rule['id']} has no user -> skip")
            continue

        if rule.get("mode") != "spot":
            print(f"[rule] {rule['id']} mode={rule.get('mode')} not implemented yet -> skip")
            continue

        spot = spots.get(rule.get("spot_id"))
        if not spot:
            print(f"[rule] {rule['id']} has no valid spot -> skip")
            continue

        # Build forecast window
        window_days = int(rule.get("forecast_window") or 5)

        merged, source, _ = _merged_forecast_for_spot(spot)
        if merged.empty:
            log_event(
                sb,
                rule_id=rule["id"],
                status="forecast_unavailable",
                ok_dates=[],
                ok_dates_count=0,
                reason="marine/weather unavailable and no fresh cache",
            )
            print(f"[spot] {spot['name']} -> empty forecast merge, skipping")
            continue
        start = pd.Timestamp(today_d)
        # Make the window inclusive: 5 => exactly 5 calendar days (start..end inclusive)
        end   = start + pd.Timedelta(days=max(0, window_days - 1))

        # Clamp nights once (reusable for pricing + email)
        min_n = max(1, int(rule.get("min_nights") or 2))
        max_n = max(min_n, int(rule.get("max_nights") or 5))


        # Respect optional explicit date range (robust to timestamps vs dates)
        if rule.get("date_from"):
            try:
                df = pd.to_datetime(str(rule["date_from"])).normalize()
                start = max(start, df)
            except Exception:
                pass
        if rule.get("date_to"):
            try:
                dt = pd.to_datetime(str(rule["date_to"])).normalize()
                end = min(end, dt)
            except Exception:
                pass
        # If window collapsed, skip early
        if end < start:
            print(f"[rule] window empty after clamping ({start.date()} > {end.date()}) -> skip")
            continue
        # Filter by date window and weekday mask
        mask = int(rule.get("days_mask") or 127)  # default: all days if mask is null
        window = merged[(merged["date"] >= start) & (merged["date"] <= end)]
        window = window[window["date"].dt.date.apply(lambda d: weekday_mask_ok(d, mask))]

        # Apply surf thresholds (coerce NULLs from DB)
        min_wave = float(rule.get("min_wave_m") or 0.0)
        max_wind = float(rule.get("max_wind_kmh") or 999.0)
        
        ok = window[(window["max_wave"] >= min_wave) & (window["min_wind"] <= max_wind)]
        ok_dates = ok["date"].dt.strftime("%Y-%m-%d").tolist()
        print(f"[rule] {rule.get('name') or 'Surf Alert'} ok_dates={len(ok_dates)} -> {ok_dates[:6]}{'...' if len(ok_dates)>6 else ''}")
        if not ok_dates:
            log_event(
                sb,
                rule_id=rule["id"],
                status="no_surf",
                ok_dates=[],
                ok_dates_count=0,
                reason="no surfable mornings in window",
            )
            continue

        # Determine “tier” by farthest ok date
        farthest = ok["date"].dt.date.max()
        days_out = (farthest - today_d).days
        tier = tier_for_days_out(days_out)

        # Flight search (sanitize IATA)
        origin = (rule.get("origin_iata") or user.get("home_airport") or "").strip().upper()
        dest   = (rule.get("dest_iata") or spot.get("nearest_airport_iata") or "LIS").strip().upper()
        
        # Validate 3-letter IATA codes
        if not _is_iata(origin) or not _is_iata(dest):
            print(f"[rule] bad IATA origin/dest '{origin}'/'{dest}' -> skip")
            continue


        
        bucket = today_d  # for your flight_cache bucketing

        # Check flight_cache (ignore placeholders)
        print(f"[cache] {origin}->{dest} bucket={bucket}")
        cached = sb_select(
            "flight_cache",
            params={
                "origin_iata": "eq."+origin,
                "dest_iata": "eq."+dest,
                "date_bucket": "eq."+str(bucket),
            },
            select="cheapest_price,deep_link"
        )

        price = None
        link  = None
        use_cache = False
        if cached:
            raw_price = cached[0].get("cheapest_price")
            link = (cached[0].get("deep_link") or "").strip()
            try:
                price = float(raw_price) if raw_price is not None else None
            except Exception:
                price = None
            bad = (not link) or link.startswith("https://example.") or link.startswith("https://www.google.") or ("#flt=" in link)
            use_cache = (price is not None) and not bad
            print(f"[cache] {'HIT' if use_cache else 'IGNORE'} price={price} link={'ok' if not bad else 'bad'}")

        if not use_cache:
            print("[cache] MISS")
            rr = None
            if have_amadeus:
                try:
                    rr = amadeus_cheapest_roundtrip(
                        origin, dest,
                        start.date(), end.date(),
                        min_n, max_n,
                        currency="EUR",
                    )
                except Exception as e:
                    print("[amadeus] live search error:", e)
                    rr = None
            else:
                print("[amadeus] creds missing -> skipping live search")

            if rr:
                price = rr.get("price")
                link  = (rr.get("links") or {}).get("kayak") or rr.get("deep_link")
                print(f"[amadeus] result -> price={price} link={'yes' if link else 'no'}")
                try:
                    sb_upsert("flight_cache", [{
                        "origin_iata": origin,
                        "dest_iata": dest,
                        "date_bucket": str(bucket),
                        "cheapest_price": price,
                        "deep_link": link
                    }], on_conflict="origin_iata,dest_iata,date_bucket")
                except Exception as e:
                    print("flight_cache upsert error:", e)
            else:
                price, link = None, None
                print("[amadeus] result -> no offer")

        # Price guards
        if price is None:
            print("[skip] no flight price found")
            log_event(
                sb,
                rule_id=rule["id"],
                status="forecast_unavailable",
                ok_dates=[],
                ok_dates_count=0,
                tier=tier,
                reason="flight price unavailable",
            )
            continue
        raw_max = rule.get("max_price_eur")
        max_price = as_money(raw_max) if raw_max is not None else DEFAULT_MAX_PRICE_EUR
        best_price = as_money(price)
        if best_price > max_price:
            print(f"[skip] price {best_price} > max {max_price}")
            log_event(
                sb,
                rule_id=rule["id"],
                status="too_pricey",
                price=best_price,
                ok_dates_count=len(ok_dates),
                tier=tier,
                reason="best price exceeds max",
                ok_dates=ok_dates,
                deep_link=link,
            )
            continue

        # Dedupe & cooldown with alert_events
        dates_str = ", ".join(ok_dates[:7])
        key = sha(f"{rule['id']}|{spot['id']}|{dates_str}|{best_price}|{link or ''}")

        # 1) exact duplicate?
        exist = sb_select(
            "alert_events",
            params={"rule_id": "eq." + rule["id"], "summary_hash": "eq." + key},
            select="id",
        )
        if exist:
            print("[dedupe] same summary already sent")
            log_event(
                sb,
                rule_id=rule["id"],
                status="sent",
                price=best_price,
                ok_dates_count=len(ok_dates),
                tier=tier,
                reason="deduped - not re-sent",
                deep_link=link,
                ok_dates=ok_dates,
                summary_hash=key,
            )
            continue

        # 2) cooldown window?
        since_iso = (now - timedelta(hours=int(rule.get("cooldown_hours") or 24))).isoformat()
        recent = sb_select(
            "alert_events",
            params={"rule_id": "eq." + rule["id"], "sent_at": "gt." + since_iso},
            select="id",
        )
        if recent:
            print("[cooldown] recently notified -> skip")
            log_event(
                sb,
                rule_id=rule["id"],
                status="sent",
                price=best_price,
                ok_dates_count=len(ok_dates),
                tier=tier,
                reason="deduped - not re-sent",
                deep_link=link,
                ok_dates=ok_dates,
                summary_hash=key,
            )
            continue

        # Compose and send email
        email = (user.get("email") or "").strip()
        if not email:
            print(f"[rule] {rule['id']} user has no email -> skip")
            continue
        
        rule_name = rule.get('name') or 'Surf Alert'
        subject = f"Surf+Flight ({tier}): {spot['name']} + {origin}→{dest} ≈ EUR {best_price}"
        window_len = int((end - start).days) + 1
        
        link_html = f' &nbsp;|&nbsp; <a href="{link}">Book</a>' if link else ''
        html = f"""
            <p><strong>Rule</strong>: {rule_name}</p>
            <p><strong>Spot</strong>: {spot['name']}</p>
            <p><strong>Surfable mornings</strong>: {dates_str}</p>
            <p><strong>Cheapest roundtrip</strong>: EUR {best_price}{link_html}</p>
            <p><strong>Tier</strong>: {tier} (window {window_len}d)</p>
            <p><strong>Rules</strong>: wave ≥ {min_wave}m, wind ≤ {max_wind} km/h; stay {min_n}-{max_n} nights.</p>
        """
        status = send_email(email, subject, html)
        print(f"[email] status={status} to={email}")
        
        if status in (200, 202):
            try:
                log_event(
                    sb,
                    rule_id=rule["id"],
                    status="sent",
                    price=best_price,
                    ok_dates_count=len(ok_dates),
                    tier=tier,
                    deep_link=link,
                    ok_dates=ok_dates,
                    summary_hash=key,
                )
            except Exception as e:
                print("alert_events insert error:", e)
# TEMP sanity:
# print("sanity", sb_select("api.v1_alert_rules", select="id", params={"limit":"1"}))

if __name__ == "__main__":
    main()
