import os, json, hashlib
from datetime import datetime, timedelta, date
import requests, pandas as pd, pytz

# --- ENV ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
TEQUILA_API_KEY = os.environ.get("TEQUILA_API_KEY")
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")

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
    r.raise_for_status()
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

# --- Flights (Kiwi/Tequila) ---
def tequila_cheapest_roundtrip(fly_from, fly_to, date_from, date_to, min_n=2, max_n=5, currency="EUR"):
    if not TEQUILA_API_KEY: return None
    url = "https://api.tequila.kiwi.com/v2/search"
    params = {
        "fly_from": fly_from, "fly_to": fly_to,
        "date_from": date_from.strftime("%d/%m/%Y"),
        "date_to": date_to.strftime("%d/%m/%Y"),
        "nights_in_dst_from": min_n, "nights_in_dst_to": max_n,
        "flight_type": "round", "curr": currency, "one_for_city": 1,
        "sort": "price", "limit": 1
    }
    r = requests.get(url, headers={"apikey": TEQUILA_API_KEY}, params=params, timeout=60)
    if r.status_code == 401: raise RuntimeError("Unauthorized Tequila API key")
    r.raise_for_status(); data = r.json()
    if not data.get("data"): return None
    best = data["data"][0]
    route = best.get("route") or []
    dep_date = (route[0].get("local_departure","").split("T")[0]) if route else None
    return {"price": best.get("price"), "deep_link": best.get("deep_link"), "departure_date": dep_date}

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
    # 1) Load active preferences
    prefs = sb_select("user_spot_prefs", params={"is_active":"eq.true"},
                      select="id,user_id,spot_id,min_wave_m,max_wind_kmh,max_price_eur,min_nights,max_nights,lookahead_days")
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
            end = start + pd.Timedelta(days=horizon_days)
    
            # Filter dates within the window
            window = merged[merged["date"].between(start, end)]
            ok = window[(window["max_wave"] >= pref["min_wave_m"]) & (window["min_wind"] <= pref["max_wind_kmh"])]
            ok_dates = ok["date"].dt.strftime("%Y-%m-%d").tolist()
            if not ok_dates: continue

            origin, dest = pref["user"]["home_airport"], "LIS"  # TODO: per-spot nearest airport
            bucket = start.date()


            # Flights: check cache first
            cached = sb_select("flight_cache",
                               params={"origin_iata":"eq."+origin, "dest_iata":"eq."+dest, "date_bucket":"eq."+str(bucket)},
                               select="cheapest_price,deep_link")
            if cached:
                price, link = cached[0]["cheapest_price"], cached[0]["deep_link"]
            else:
                # use the same window used above
                rr = tequila_cheapest_roundtrip(
                    origin, dest,
                    bucket, (start + pd.Timedelta(days=horizon_days)).date(),
                    pref["min_nights"], pref["max_nights"]
                )
                price = rr["price"] if rr else None
                link  = rr["deep_link"] if rr else None
                try:
                    sb_upsert("flight_cache", [{
                        "origin_iata": origin, "dest_iata": dest, "date_bucket": str(bucket),
                        "cheapest_price": price, "deep_link": link
                    }], on_conflict="origin_iata,dest_iata,date_bucket")
                except Exception as e:
                    print("flight_cache upsert error:", e)

            if price is None or price > pref["max_price_eur"]: continue

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
