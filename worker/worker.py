import os, json, hashlib
from datetime import datetime, timedelta, date
import requests, pandas as pd, pytz

# --- ENV ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
TEQUILA_API_KEY = os.environ.get("TEQUILA_API_KEY")
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

# --- Supabase helpers ---
def sb_select(table, params=None, select="*"):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    q = {"select": select}
    if params: q.update(params)
    r = requests.get(url, headers=HEADERS, params=q, timeout=60)
    r.raise_for_status()
    return r.json()

def sb_upsert(table, rows, on_conflict=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = HEADERS.copy()
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    params = {"on_conflict": on_conflict} if on_conflict else None
    r = requests.post(url, headers=headers, params=params, data=json.dumps(rows), timeout=60)
    try:
        r.raise_for_status()
    except requests.HTTPError as e:
        body = getattr(e.response, "text", "")[:600]
        raise RuntimeError(f"Upsert {table} failed: {e} | Body: {body}")
    return r.json()

def sb_insert(table, row):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = HEADERS.copy()
    headers["Prefer"] = "return=representation"
    r = requests.post(url, headers=headers, data=json.dumps(row), timeout=60)
    r.raise_for_status()
    return r.json()

# --- Forecast (Open-Meteo; no API key) ---
def fetch_wave_stats(lat, lon, tz_name, hours):
    murl = "https://marine-api.open-meteo.com/v1/marine"
    r = requests.get(murl, params={"latitude":lat,"longitude":lon,"hourly":"wave_height","timezone":tz_name}, timeout=60)
    r.raise_for_status(); d = r.json()
    df = pd.DataFrame({"time": pd.to_datetime(d["hourly"]["time"]), "wave": d["hourly"]["wave_height"]})
    df["date"] = df["time"].dt.date; df["hour"] = df["time"].dt.hour
    df = df[df["hour"].isin(hours)]
    return df.groupby("date")["wave"].agg(["min","max","mean"]).rename(columns={"mean":"avg"}).reset_index()

def fetch_wind_stats(lat, lon, tz_name, hours):
    wurl = "https://api.open-meteo.com/v1/forecast"
    r = requests.get(wurl, params={"latitude":lat,"longitude":lon,"hourly":"wind_speed_10m","wind_speed_unit":"kmh","timezone":tz_name}, timeout=60)
    r.raise_for_status(); d = r.json()
    df = pd.DataFrame({"time": pd.to_datetime(d["hourly"]["time"]), "wind": d["hourly"]["wind_speed_10m"]})
    df["date"] = df["time"].dt.date; df["hour"] = df["time"].dt.hour
    df = df[df["hour"].isin(hours)]
    return df.groupby("date")["wind"].agg(["min","max","mean"]).rename(columns={"mean":"avg"}).reset_index()

# --- Flights (Amadeus) ---
_token = {"access_token": None, "exp": 0}

def _amadeus_token():
    import time
    if _token["access_token"] and time.time() < _token["exp"] - 60:
        return _token["access_token"]
    print("[amadeus] fetching new token...")
    r = requests.post(
        f"{AMADEUS_BASE}/v1/security/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": AMADEUS_CLIENT_ID,
            "client_secret": AMADEUS_CLIENT_SECRET,
        },
        timeout=60,
    )
    r.raise_for_status()
    d = r.json()
    _token["access_token"] = d["access_token"]
    _token["exp"] = __import__("time").time() + int(d.get("expires_in", 1800))
    print("[amadeus] token ok; expires_in:", d.get("expires_in"))
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

    r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=60)

    # Refresh once on token expiry
    if r.status_code == 401:
        _token["access_token"] = None
        headers["Authorization"] = f"Bearer {_amadeus_token()}"
        r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=60)

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
    r = requests.get(f"{AMADEUS_BASE}/v2/shopping/flight-offers", headers=h, params=params, timeout=60)

    if r.status_code == 401:
        print("[amadeus] 401 once; retrying with fresh token...")
        _token["access_token"] = None
        h["Authorization"] = f"Bearer {_amadeus_token()}"
        r = requests.get(f"{AMADEUS_BASE}/v2/shopping/flight-offers", headers=h, params=params, timeout=60)

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
        for n in stay_candidates:
            ret = dep + timedelta(days=n)
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

def main():
    print("[worker] start")
    # 1) Load active preferences
    prefs = sb_select("user_spot_prefs", params={"is_active":"eq.true"},
                      select="id,user_id,spot_id,min_wave_m,max_wind_kmh,max_price_eur,min_nights,max_nights,lookahead_days")
    print("[worker] active prefs:", len(prefs))
    if not prefs:
        print("No active user preferences found."); return

    # Fetch users and spots referenced
    user_ids = sorted({p["user_id"] for p in prefs})
    spot_ids = sorted({p["spot_id"] for p in prefs})

    users = {}
    for uid in user_ids:
        u = sb_select("users", params={"id":"eq."+uid}, select="id,email,home_airport")
        if u: users[uid] = u[0]

    spots = {}
    for sid in spot_ids:
        s = sb_select("spots", params={"id":"eq."+sid}, select="id,name,latitude,longitude,timezone")
        if s: spots[sid] = s[0]

    # 2) Batch by spot
    by_spot = {}
    for p in prefs:
        sp = spots.get(p["spot_id"]); us = users.get(p["user_id"])
        if not sp or not us: continue
        by_spot.setdefault(sp["id"], {"spot": sp, "prefs": []})
        gp = dict(p); gp["user"] = us
        by_spot[sp["id"]]["prefs"].append(gp)

    today = date.today()
    for spot_id, group in by_spot.items():
        sp = group["spot"]
        hours = [6,7,8,9,10,11,12]
        wave = fetch_wave_stats(sp["latitude"], sp["longitude"], sp["timezone"], hours)
        wind = fetch_wind_stats(sp["latitude"], sp["longitude"], sp["timezone"], hours)
        merged = pd.merge(wave, wind, on="date", how="inner", suffixes=("_wave","_wind"))
        print(f"[spot] {sp['name']} (id={spot_id}) prefs={len(group['prefs'])} merged_rows={len(merged)}") #new print added XYX

        
        # Cache generic stats per date
        cache_rows = []
        for _, r in merged.iterrows():
            cache_rows.append({
                "spot_id": spot_id, "date": str(r["date"]), "morning_ok": False,
                "wave_stats": {"min": float(r["min_wave"]), "max": float(r["max_wave"]), "avg": float(r["avg_wave"])},
                "wind_stats": {"min": float(r["min_wind"]), "max": float(r["max_wind"]), "avg": float(r["avg_wind"])}
            })
        if cache_rows:
            try: sb_upsert("forecast_cache", cache_rows, on_conflict="spot_id,date")
            except Exception as e: print("forecast_cache upsert error:", e)

        # Evaluate per user preference
        for pref in group["prefs"]:
            # Normalize date column to pandas Timestamp (midnight) so comparisons are consistent
            merged["date"] = pd.to_datetime(merged["date"]).dt.normalize()
    
            # Build a window [start, end] in the same Timestamp type
            # Use naive UTC midnight (no timezone info)
            start = pd.Timestamp(datetime.utcnow().date())
            horizon_days = int(pref.get("lookahead_days") or 14)
            horizon_days = min(horizon_days, 3)  # TEMP: keep runs fast during tests
            end = start + pd.Timedelta(days=horizon_days)
            print(
                f"[eval] user={pref['user_id']} origin={pref['user']['home_airport']} dest=LIS "
                f"rules: wave≥{pref['min_wave_m']}m wind≤{pref['max_wind_kmh']}km/h "
                f"price≤€{pref['max_price_eur']} window={start.date()}..{end.date()}"
            ) #new print added XYX
    
            # Filter dates within the window
            window = merged[merged["date"].between(start, end)]
            ok = window[(window["max_wave"] >= pref["min_wave_m"]) & (window["min_wind"] <= pref["max_wind_kmh"])]
            ok_dates = ok["date"].dt.strftime("%Y-%m-%d").tolist()
            print(f"[eval] ok_dates={len(ok_dates)} -> {ok_dates[:5]}{'...' if len(ok_dates)>5 else ''}") #print added XXYX
            if not ok_dates:
                print("[skip] no OK surf dates in window")
                continue

            origin, dest = pref["user"]["home_airport"], "LIS"  # TODO: per-spot nearest airport
            bucket = start.date()



            # Flights: check cache first (ignore junk placeholders)
            # Flights: check cache first (invalidate Google/placeholder links)
            print(f"[cache] {origin}->{dest} bucket={bucket}")
            cached = sb_select(
                "flight_cache",
                params={
                    "origin_iata": "eq." + origin,
                    "dest_iata": "eq." + dest,
                    "date_bucket": "eq." + str(bucket),
                },
                select="cheapest_price,deep_link"
            )

            price = None
            link = None
            use_cache = False

            if cached:
                raw_price = cached[0].get("cheapest_price")
                link = (cached[0].get("deep_link") or "").strip()
                # coerce price to float if present
                try:
                    price = float(raw_price) if raw_price is not None else None
                except (TypeError, ValueError):
                    price = None

                is_google = link.startswith("https://www.google.") or "#flt=" in link
                is_placeholder = (not link) or link.startswith("https://example.")
                use_cache = (price is not None) and not (is_google or is_placeholder)

                if use_cache:
                    print(f"[cache] HIT price={price} link=ok")
                else:
                    reasons = []
                    if price is None: reasons.append("invalid price")
                    if is_google: reasons.append("google link")
                    if is_placeholder: reasons.append("placeholder link")
                    print(f"[cache] IGNORE ({', '.join(reasons)}) -> calling Amadeus…")

            if not use_cache:
                print("[cache] MISS -> calling Amadeus…")
                rr = amadeus_cheapest_roundtrip(
                    origin,
                    dest,
                    start.date(),  # same window as your surf filter
                    (start + pd.Timedelta(days=horizon_days)).date(),
                    pref["min_nights"],
                    pref["max_nights"],
                    currency="EUR",
                )
                price = rr["price"] if rr else None
                # Prefer Kayak deep link when available
                link = ((rr or {}).get("links") or {}).get("kayak") if rr else None
                if not link and rr:
                    link = rr.get("deep_link")
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



            if price is None:
                print("[skip] no flight price found")
                continue
            if price > pref["max_price_eur"]:
                print(f"[skip] price {price} > max {pref['max_price_eur']}")
                continue


            dates_str = ", ".join(ok_dates[:7])
            key = sha(f"{pref['user_id']}|{pref['spot_id']}|{dates_str}|{price}|{link or ''}")
            exist = sb_select("alerts", params={"user_id":"eq."+pref["user_id"], "summary_hash":"eq."+key}, select="id")
            if exist: continue

            subject = f"Surf+Flight: {sp['name']} looks good + {origin}→{dest} ≈ EUR {price}"
            html = f"""
                <p><strong>Spot</strong>: {sp['name']}</p>
                <p><strong>Surfable mornings</strong>: {dates_str}</p>
                <p><strong>Cheapest roundtrip</strong>: EUR {price} &nbsp;|&nbsp; <a href="{link}">Book</a></p>
                <p><strong>Rules</strong>: wave ≥ {pref['min_wave_m']}m, wind ≤ {pref['max_wind_kmh']} km/h; stay {pref['min_nights']}-{pref['max_nights']} nights.</p>
            """

            status = send_email(pref["user"]["email"], subject, html)
            print(f"[email] status={status} to={pref['user']['email']}")

            if status in (200, 202):
                try:
                    sb_insert("alerts", {
                        "user_id": pref["user_id"], "spot_id": pref["spot_id"],
                        "summary_hash": key,
                        "details": {"ok_dates": ok_dates, "price": price, "link": link,
                                    "origin": origin, "dest": dest}
                    })
                except Exception as e:
                    print("alerts insert error:", e)

if __name__ == "__main__":
    main()
