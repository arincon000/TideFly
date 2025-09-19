import os
import json
import time
import hashlib
from datetime import datetime, timedelta, timezone, date
from typing import Optional, Tuple, List, Dict

import requests
from supabase import create_client, Client
import pytz
import pandas as pd

from dotenv import load_dotenv
import pathlib
# Let CI (GitHub Actions) env win; only use .env.local for local dev
load_dotenv(pathlib.Path(__file__).resolve().parents[1] / ".env.local", override=False)
# Alternatively (equivalent):
# if os.getenv("CI") != "true":
#     load_dotenv(pathlib.Path(__file__).resolve().parents[1] / ".env.local", override=True)


# --------- ENV ---------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
# Email configuration
EMAIL_FROM = os.getenv("EMAIL_FROM", "alerts@tidefly.app")
AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET")
AMADEUS_ENV = (os.getenv("AMADEUS_ENV") or "test").lower()
AMADEUS_BASE = "https://api.amadeus.com" if AMADEUS_ENV == "prod" else "https://test.api.amadeus.com"

ENABLE_AFFILIATES = (os.getenv("ENABLE_AFFILIATES") or "false").lower() == "true"
AVIA_AFFILIATE_ID = (os.getenv("AVIA_AFFILIATE_ID") or "").strip()
ENABLE_HOTEL_CTA = (os.getenv("ENABLE_HOTEL_CTA") or "false").lower() == "true"
HOTEL_PROVIDER = (os.getenv("HOTEL_PROVIDER") or "hotellook").strip()
TP_P_HOTELLOOK = os.getenv("TP_P_HOTELLOOK") or "4115"

AMADEUS_MODE = (os.getenv("AMADEUS_MODE") or "api").lower()  # "api" | "fake"
AMADEUS_FAKE_PRICE = float(os.getenv("AMADEUS_FAKE_PRICE") or 199.0)
DRY_RUN = (os.getenv("DRY_RUN") or "false").lower() == "true"
DEBUG_BYPASS_COOLDOWN = (os.getenv("DEBUG_BYPASS_COOLDOWN") or "false").lower() == "true"
BYPASS_COOLDOWN = (os.getenv("BYPASS_COOLDOWN") or "false").lower() == "true"

# Forecast checking
ENABLE_FORECAST_CHECK = os.getenv("ENABLE_FORECAST_CHECK", "true").lower() == "true"
WAVE_KEY = os.getenv("FORECAST_WAVE_KEY", "avg")  # Use avg for wave planning (realistic expectations)
WIND_KEY = os.getenv("FORECAST_WIND_KEY", "max")  # Use max for wind (conservative, wind ruins surf)
# keep your existing AMADEUS_ENV logic as-is (defaults to test)

# --- Surfable summary helpers ---
FORECAST_WAVE_KEY = os.getenv("FORECAST_WAVE_KEY", "h_max_m")   # stored in wave_stats
FORECAST_WIND_KEY = os.getenv("FORECAST_WIND_KEY", "max")       # stored in wind_stats
FORECAST_WIND_UNIT = os.getenv("FORECAST_WIND_UNIT", "kmh")     # 'kmh' or 'ms'

def _to_float(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None

def _wind_as_kmh(val):
    v = _to_float(val)
    if v is None:
        return None
    return v * 3.6 if FORECAST_WIND_UNIT.lower() in ("ms", "m/s", "meter_per_second", "mps") else v

def compute_ok_dates_from_cache(sb, spot_id, depart_date, return_date, wave_min_m, wave_max_m, wind_max_kmh, days_mask):
    """
    Accepts depart/return as date/datetime or 'YYYY-MM-DD' strings.
    Returns ISO 'YYYY-MM-DD' strings that meet thresholds AND days_mask.
    Safe: returns [] on any error.
    """
    try:
        def _as_ymd(x):
            if x is None:
                return None
            if isinstance(x, str):
                # assume already 'YYYY-MM-DD'
                return x
            if isinstance(x, datetime):
                return x.date().isoformat()
            if isinstance(x, date):
                return x.isoformat()
            # numbers or other types → string
            return str(x)

        start = _as_ymd(depart_date) or date.today().isoformat()
        end   = _as_ymd(return_date) or start

        # ensure mask is a 7-char string (Mon..Sun)
        mask = str(days_mask or "1111111")
        if len(mask) < 7:
            mask = mask.ljust(7, "0")

        if spot_id is None:
            return []  # No spot_id means no forecast check needed
        
        res = sb.table("forecast_cache").select("date,wave_stats,wind_stats") \
            .eq("spot_id", str(spot_id)).gte("date", start).lte("date", end).execute()

        ok = []
        for row in (res.data or []):
            d = date.fromisoformat(row["date"])
            if mask[d.isoweekday() - 1] != "1":  # Mon=1..Sun=7 -> mask[0..6]
                continue
            ws = row.get("wave_stats") or {}
            vs = row.get("wind_stats") or {}
            wave = _to_float(ws.get(WAVE_KEY)) or _to_float(ws.get("wave_height_max")) or _to_float(ws.get("h_mean_m"))
            wind_kmh = _wind_as_kmh(vs.get(WIND_KEY)) or _to_float(vs.get("max_kmh"))
            if wave is None or wind_kmh is None:
                continue
            if (wave_min_m is not None and wave < float(wave_min_m)) or \
               (wave_max_m is not None and wave > float(wave_max_m)) or \
               (wind_max_kmh is not None and wind_kmh > float(wind_max_kmh)):
                continue
            ok.append(d.isoformat())
        return ok
    except Exception as e:
        print("[summary] compute_ok_dates_from_cache error:", e)
        return []

def best_block(ok_dates):
    """Pick best contiguous block from ISO dates. Returns (start, end) or (None, None)."""
    if not ok_dates:
        return None, None
    d = sorted(ok_dates)
    best_s = cur_s = d[0]; best_e = cur_e = d[0]; best_len = cur_len = 1
    def plus1(s):
        t = datetime.fromisoformat(s) + timedelta(days=1)
        return t.date().isoformat()
    for x in d[1:]:
        if x == plus1(cur_e):
            cur_e = x; cur_len += 1
        else:
            if cur_len > best_len:
                best_s, best_e, best_len = cur_s, cur_e, cur_len
            cur_s = cur_e = x; cur_len = 1
    if cur_len > best_len:
        best_s, best_e = cur_s, cur_e
    return best_s, best_e

# --------- Helpers ---------

def _now_utc() -> datetime:
	return datetime.now(timezone.utc)


def _dow_mask_allows(d: date, tzname: str, days_mask: int) -> bool:
	"""
	days_mask uses 0=Sun..6=Sat. We treat forecast_cache.date as local date for the spot.
	If you prefer strict tz handling, convert midnight local; for daily data it's equivalent.
	"""
	# Python weekday(): Monday=0..Sunday=6; we need Sunday=0..Saturday=6
	# Map: Mon(0)->1, Tue(1)->2, ..., Sat(5)->6, Sun(6)->0
	mon0 = d.weekday()
	sun0 = (mon0 + 1) % 7
	return (days_mask & (1 << sun0)) != 0


def _extract_number(j: dict | None, preferred_key: str, fallbacks: tuple[str, ...]) -> float | None:
	if not isinstance(j, dict):
		return None
	if preferred_key in j and isinstance(j[preferred_key], (int, float)):
		return float(j[preferred_key])
	for k in fallbacks:
		v = j.get(k)
		if isinstance(v, (int, float)):
			return float(v)
	return None


def fetch_forecast_days(supabase: Client, spot_id: str, start_date: date, end_date: date):
	"""Fetch forecast data for a spot within date range. If no cached data exists, fetch fresh from Open-Meteo."""
	try:
		res = supabase.table("forecast_cache").select(
			"date, morning_ok, wave_stats, wind_stats"
		).eq("spot_id", spot_id).gte("date", start_date.isoformat()).lte("date", end_date.isoformat()).order("date", desc=False).execute()
		data = res.data or []
		
		# If we have cached data, return it
		if data:
			print(f"🔍 RAW FORECAST DATA (first 2 days):")
			for i, row in enumerate(data[:2]):
				print(f"   Day {i+1}: {row}")
				if i == 1:  # Show only first 2 to avoid spam
					break
			if len(data) > 2:
				print(f"   ... and {len(data)-2} more days")
			return data
		
		# No cached data - fetch fresh from Open-Meteo
		print(f"🔄 No cached data found, fetching fresh from Open-Meteo...")
		return fetch_fresh_forecast_data(supabase, spot_id, start_date, end_date)
		
	except Exception as e:
		print(f"[forecast] fetch error spot_id={spot_id}: {e}")
		return []


def get_spot_timezone(supabase: Client, spot_id: str) -> str:
	"""Get timezone for a spot."""
	try:
		res = supabase.table("spots").select("timezone").eq("id", spot_id).single().execute()
		return res.data.get("timezone") if res.data else "UTC"
	except Exception as e:
		print(f"[forecast] timezone error spot_id={spot_id}: {e}")
		return "UTC"


def fetch_fresh_forecast_data(supabase: Client, spot_id: str, start_date: date, end_date: date):
	"""Fetch fresh forecast data from Open-Meteo and cache it."""
	try:
		# Get spot information
		spot_res = supabase.table("spots").select("id, name, latitude, longitude, timezone").eq("id", spot_id).single().execute()
		if not spot_res.data:
			print(f"[fresh] Spot not found: {spot_id}")
			return []
		
		spot = spot_res.data
		lat, lon, tz = spot["latitude"], spot["longitude"], spot.get("timezone", "UTC")
		
		# Calculate forecast days needed
		forecast_days = (end_date - start_date).days + 1
		forecast_days = min(forecast_days, 16)  # Open-Meteo supports up to 16 days
		
		print(f"[fresh] Fetching {forecast_days} days for {spot['name']} ({lat}, {lon})")
		
		# Import the forecast fetching function from the old worker
		import sys
		import os
		sys.path.append(os.path.dirname(os.path.dirname(__file__)))
		from worker.worker import fetch_wave_wind_stats
		
		# Fetch forecast data
		hours = [6, 7, 8, 9, 10, 11, 12]  # Morning hours
		merged, merged_hours = fetch_wave_wind_stats(lat, lon, tz, hours, forecast_days)
		
		if merged is None or merged.empty:
			print(f"[fresh] Failed to fetch forecast data for {spot['name']}")
			return []
		
		print(f"[fresh] Successfully fetched {len(merged)} days of forecast data")
		
		# Cache the data
		cache_rows = []
		cached_at = datetime.now(timezone.utc).isoformat()
		
		for _, row in merged.iterrows():
			def safe_float(val):
				if pd.isna(val) or val is None:
					return 0.0
				return float(val)
			
			cache_rows.append({
				"spot_id": spot_id,
				"date": str(row["date"].date()),
				"morning_ok": True,
				"wave_stats": {
					"min": safe_float(row["min_wave"]),
					"max": safe_float(row["max_wave"]),
					"avg": safe_float(row["avg_wave"]),
				},
				"wind_stats": {
					"min": safe_float(row["min_wind"]),
					"max": safe_float(row["max_wind"]),
					"avg": safe_float(row["avg_wind"]),
				},
				"cached_at": cached_at,
			})
		
		# Insert into cache
		try:
			# Clear existing data for this spot first
			supabase.table("forecast_cache").delete().eq("spot_id", spot_id).execute()
			# Insert new data
			result = supabase.table("forecast_cache").insert(cache_rows).execute()
			print(f"[fresh] Cached {len(result.data)} forecast rows for {spot['name']}")
		except Exception as e:
			print(f"[fresh] Cache insert error: {e}")
		
		# Return the data in the expected format
		return [
			{
				"date": row["date"],
				"morning_ok": True,
				"wave_stats": {
					"min": safe_float(row["min_wave"]),
					"max": safe_float(row["max_wave"]),
					"avg": safe_float(row["avg_wave"]),
				},
				"wind_stats": {
					"min": safe_float(row["min_wind"]),
					"max": safe_float(row["max_wind"]),
					"avg": safe_float(row["avg_wind"]),
				},
			}
			for _, row in merged.iterrows()
		]
		
	except Exception as e:
		print(f"[fresh] Error fetching fresh forecast data: {e}")
		import traceback
		traceback.print_exc()
		return []


def forecast_ok_daily(supabase: Client, rule: dict) -> tuple[bool, list[str]]:
	"""Return (True/False, list of good days) if ANY day in the window matches wave/wind constraints & day mask."""
	if not ENABLE_FORECAST_CHECK:
		print(f"[forecast] ENABLE_FORECAST_CHECK=False, skipping check")
		return True, []

	rule_id = rule.get('id')
	wm = rule.get("wave_min_m")
	wM = rule.get("wave_max_m")
	vK = rule.get("wind_max_kmh")
	
	# Print user preferences clearly
	print(f"\n{'='*60}")
	print(f"[FORECAST CHECK] Rule ID: {rule_id}")
	print(f"{'='*60}")
	print(f"📋 USER PREFERENCES:")
	print(f"   Wave Height: {wm}m ≤ waves ≤ {wM}m" if wM else f"   Wave Height: ≥ {wm}m" if wm else "   Wave Height: no limit")
	print(f"   Wind Speed:  ≤ {vK} km/h" if vK else "   Wind Speed:  no limit")
	
	# If no pro filters set, nothing to enforce
	if wm is None and wM is None and vK is None:
		print(f"✅ No constraints set - allowing all conditions")
		return True, []

	spot_id = rule.get("spot_id")
	if not spot_id:
		print(f"⚠️  No spot_id - skipping forecast check")
		return True, []  # Skip forecast check if no spot_id
	
	window_days = int(rule.get("forecast_window") or 5)
	today_utc = datetime.now(timezone.utc).date()
	end_date = today_utc + timedelta(days=window_days)
	
	print(f"📍 Spot ID: {spot_id}")
	print(f"📅 Forecast Window: {window_days} days ({today_utc} to {end_date})")

	rows = fetch_forecast_days(supabase, spot_id=spot_id, start_date=today_utc, end_date=end_date)
	if not rows:
		print(f"❌ No forecast data found for spot_id={spot_id}")
		return False, []  # no data => don't notify

	tzname = get_spot_timezone(supabase, spot_id)
	days_mask = int(rule.get("days_mask") or 0b1111111)
	
	print(f"🌍 Timezone: {tzname}")
	print(f"📆 Days Allowed: {days_mask:07b} (bit 0=Mon, bit 6=Sun)")
	print(f"📊 Found {len(rows)} forecast days")
	
	# Show OpenMeteo data structure
	print(f"\n🌊 OPENMETEO DATA STRUCTURE:")
	print(f"   Wave Key Used: {WAVE_KEY}")
	print(f"   Wind Key Used: {WIND_KEY}")
	if rows:
		# Show the structure of the first day's data
		first_row = rows[0]
		wave_stats = first_row.get("wave_stats")
		wind_stats = first_row.get("wind_stats")
		
		print(f"   Sample Wave Stats: {wave_stats}")
		print(f"   Sample Wind Stats: {wind_stats}")
		
		# Show what keys are available in the data
		if isinstance(wave_stats, dict):
			wave_keys = list(wave_stats.keys())
			print(f"   Available Wave Keys: {wave_keys}")
		if isinstance(wind_stats, dict):
			wind_keys = list(wind_stats.keys())
			print(f"   Available Wind Keys: {wind_keys}")
	else:
		print(f"   No data available to show structure")

	# keys we'll try if preferred ones aren't present
	# waves in meters
	wave_fallbacks = ("p90_m", "max_m", "mean_m", "avg_m", "median_m", "p50", "max", "mean", "min", "avg")
	# wind in km/h
	wind_fallbacks = ("p90_kmh", "max_kmh", "mean_kmh", "avg_kmh", "median_kmh", "p50", "max", "mean", "min", "avg")

	# Create a summary table
	print(f"\n📈 FORECAST DATA SUMMARY:")
	print(f"{'Date':<12} {'Day':<4} {'Wave(m)':<8} {'Wind(km/h)':<11} {'Morning':<8} {'Wave OK':<8} {'Wind OK':<8} {'Result'}")
	print(f"{'-'*80}")
	
	any_passed = False
	good_days = []
	day_count = 0
	for r in rows:
		try:
			d = datetime.fromisoformat(str(r["date"])).date()
		except Exception:
			continue
			
		# Check day of week
		if not _dow_mask_allows(d, tzname, days_mask):
			day_name = d.strftime("%a")
			print(f"{d}     {day_name:<4} {'N/A':<8} {'N/A':<11} {'N/A':<8} {'N/A':<8} {'N/A':<8} ❌ Day not allowed")
			continue

		wv = _extract_number(r.get("wave_stats"), WAVE_KEY, wave_fallbacks)
		wd = _extract_number(r.get("wind_stats"), WIND_KEY, wind_fallbacks)
		morning_ok = bool(r.get("morning_ok", True))
		
		# Debug: show extraction details for first few days
		if day_count < 2:  # Show details for first 2 days
			print(f"   🔍 Data Extraction for {d}:")
			print(f"      Wave Stats Raw: {r.get('wave_stats')}")
			print(f"      Wind Stats Raw: {r.get('wind_stats')}")
			print(f"      Extracted Wave: {wv} (using key '{WAVE_KEY}')")
			print(f"      Extracted Wind: {wd} (using key '{WIND_KEY}')")
			print(f"      Morning OK: {morning_ok}")
		
		day_count += 1
		
		# Check conditions
		wave_ok = True
		wave_reason = ""
		if wm is not None:
			wave_ok = (wv is not None and wv >= float(wm))
			if not wave_ok:
				wave_reason = f"< {wm}m"
		if wave_ok and wM is not None:
			wave_ok = (wv is not None and wv <= float(wM))
			if not wave_ok:
				wave_reason = f"> {wM}m"

		wind_ok = True
		wind_reason = ""
		if vK is not None:
			wind_ok = (wd is not None and wd <= float(vK))
			if not wind_ok:
				wind_reason = f"> {vK} km/h"

		day_name = d.strftime("%a")
		wave_str = f"{wv:.1f}" if wv is not None else "N/A"
		wind_str = f"{wd:.1f}" if wd is not None else "N/A"
		morning_str = "✅" if morning_ok else "❌"
		wave_ok_str = "✅" if wave_ok else f"❌ {wave_reason}"
		wind_ok_str = "✅" if wind_ok else f"❌ {wind_reason}"
		
		if morning_ok and wave_ok and wind_ok:
			result = "🎯 PASS"
			any_passed = True
			good_days.append(d.isoformat())
		else:
			result = "❌ FAIL"

		print(f"{d}     {day_name:<4} {wave_str:<8} {wind_str:<11} {morning_str:<8} {wave_ok_str:<8} {wind_ok_str:<8} {result}")

	print(f"{'-'*80}")
	if any_passed:
		print(f"🎉 RESULT: At least one day passed all conditions!")
	else:
		print(f"😞 RESULT: No days passed all conditions")
		print(f"💡 Check if your wave/wind thresholds are too strict for current conditions")
	print(f"{'='*60}\n")
	
	return any_passed, good_days


def _with_backoff(fn, *a, **kw):
	"""Retry on 429 or RequestException with 3 tries and exp backoff."""
	for i in range(3):
		try:
			r = fn(*a, **kw)
			if getattr(r, "status_code", 200) != 429:
				return r
		except requests.RequestException:
			if i == 2:
				raise
		time.sleep(2 ** i)
	return r


# --------- API: Eligible alerts ---------

def fetch_eligible_alerts(supabase: Client) -> List[Dict]:
	"""Fetch active rules and filter in Python per eligibility spec."""
	now = _now_utc()
	# For now, query the public alert_rules table directly
	# TODO: Create api.v1_alert_rules view in the database
	res = supabase.from_("alert_rules").select("*").execute()
	rows = res.data or []
	print(f"[eligibility] found {len(rows)} total rules")
	eligible: List[Dict] = []
	for r in rows:
		rule_id = r.get("id")
		print(f"[eligibility] checking rule_id={rule_id}")
		
		if not r.get("is_active"):
			print(f"[eligibility] rule_id={rule_id} not active")
			continue
			
		pu = r.get("paused_until")
		if pu:
			try:
				pu_dt = datetime.fromisoformat(str(pu).replace("Z", "+00:00"))
			except Exception:
				pu_dt = None
			if pu_dt and pu_dt > now:
				print(f"[eligibility] rule_id={rule_id} paused until {pu_dt}")
				continue
				
		last_checked = r.get("last_checked_at")
		try:
			last_checked_dt = datetime.fromisoformat(str(last_checked).replace("Z", "+00:00")) if last_checked else datetime.fromtimestamp(0, tz=timezone.utc)
		except Exception:
			last_checked_dt = datetime.fromtimestamp(0, tz=timezone.utc)
		cool = int(r.get("cooldown_hours") or 24)
		cooldown_until = last_checked_dt + timedelta(hours=cool)
		print(f"[eligibility] rule_id={rule_id} last_checked={last_checked_dt}, cooldown_hours={cool}, cooldown_until={cooldown_until}")
		
		if cooldown_until > now:
			if DEBUG_BYPASS_COOLDOWN or BYPASS_COOLDOWN:
				print(f"[eligibility] rule_id={rule_id} in cooldown until {cooldown_until} (BYPASSED for debugging)")
			else:
				print(f"[eligibility] rule_id={rule_id} in cooldown until {cooldown_until}")
				continue
			
		print(f"[eligibility] rule_id={rule_id} ELIGIBLE")
		eligible.append(r)
	# Order by created_at asc (best-effort)
	eligible.sort(key=lambda x: str(x.get("created_at") or ""))
	print(f"[eligibility] final eligible count: {len(eligible)}")
	return eligible


# --------- Amadeus ---------
_token: Dict[str, object] = {"access_token": None, "exp": 0.0}

def _amadeus_token() -> str:
	if _token["access_token"] and time.time() < float(_token["exp"]) - 60:
		return _token["access_token"]  # type: ignore
	r = _with_backoff(
		requests.post,
		f"{AMADEUS_BASE}/v1/security/oauth2/token",
		data={
			"grant_type": "client_credentials",
			"client_id": AMADEUS_CLIENT_ID,
			"client_secret": AMADEUS_CLIENT_SECRET,
		},
		timeout=10,
	)
	r.raise_for_status()
	d = r.json() or {}
	_token["access_token"] = d.get("access_token")
	_token["exp"] = time.time() + int(d.get("expires_in", 1800))
	return _token["access_token"]  # type: ignore


def amadeus_cheapest_roundtrip(origin: str, dest: str, depart_ymd: str, return_ymd: Optional[str], currency: str = "USD") -> Optional[dict]:
	"""Return {'total_usd': float, 'deep_link': str|None, 'raw': dict} or None."""

	# ---- FAKE MODE ----
	if AMADEUS_MODE == "fake":
		fake = {
			"total_usd": AMADEUS_FAKE_PRICE,
			"deep_link": "https://aviasales.com/search/FAKE?marker=test",
			"raw": {"fake": True, "origin": origin, "dest": dest, "depart": depart_ymd, "return": return_ymd},
		}
		return fake

	# ---- API MODE (test or prod) ----
	if not (AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET):
		return None

	params = {
		"originLocationCode": origin,
		"destinationLocationCode": dest,
		"departureDate": depart_ymd,
		"adults": 1,
		"currencyCode": currency,
		"max": 10,
	}
	if return_ymd:
		params["returnDate"] = return_ymd

	h = {"Authorization": f"Bearer {_amadeus_token()}", "Accept": "application/json"}
	r = _with_backoff(requests.get, f"{AMADEUS_BASE}/v2/shopping/flight-offers", headers=h, params=params, timeout=10)
	if r.status_code == 401:
		_token["access_token"] = None
		h["Authorization"] = f"Bearer {_amadeus_token()}"
		r = _with_backoff(requests.get, f"{AMADEUS_BASE}/v2/shopping/flight-offers", headers=h, params=params, timeout=10)
	if r.status_code == 429:
		return None
	try:
		r.raise_for_status()
	except requests.HTTPError:
		return None

	data = (r.json() or {}).get("data") or []
	if not data:
		return None

	def _tot(o):
		try:
			return float(o.get("price", {}).get("total"))
		except Exception:
			return float("inf")

	best = min(data, key=_tot)
	try:
		total = float(best.get("price", {}).get("total"))
	except Exception:
		return None
	return {"total_usd": total, "deep_link": None, "raw": best}


# --------- Affiliates ---------

def _ddmm(ymd: str) -> str:
	try:
		y, m, d = ymd.split("-")
		return f"{d}{m}"
	except Exception:
		return ""


def build_flight_link_aviasales(origin: str, dest: str, depart_ymd: str, return_ymd: Optional[str], sub_id: str) -> Optional[str]:
	if not ENABLE_AFFILIATES:
		return None
	marker = AVIA_AFFILIATE_ID
	if not (marker and origin and dest and depart_ymd):
		return None
	out = f"{origin.upper()}{_ddmm(depart_ymd)}{dest.upper()}"
	rt = _ddmm(return_ymd) if return_ymd else ""
	url = f"https://www.aviasales.com/search/{out}{rt}?marker={requests.utils.quote(marker)}"
	if sub_id:
		url += f"&sub_id={requests.utils.quote(sub_id)}"
	return url


def build_hotel_link_hotellook(city: str, checkin_ymd: str, checkout_ymd: str, sub_id: str) -> Optional[str]:
	if not (ENABLE_AFFILIATES and ENABLE_HOTEL_CTA):
		return None
	marker = AVIA_AFFILIATE_ID
	if not (marker and city and checkin_ymd and checkout_ymd):
		return None
	
	# Generate direct Hotellook URL with affiliate tracking
	params = {
		"destination": city,
		"checkIn": checkin_ymd,
		"checkOut": checkout_ymd,
		"adults": "1",
		"rooms": "1",
		"children": "0",
		"locale": "en",
		"currency": "USD",
		"marker": marker
	}
	if sub_id:
		params["sub_id"] = sub_id
	
	h = requests.PreparedRequest()
	h.prepare_url("https://search.hotellook.com/", params)
	return h.url


# --------- Small helpers ---------

_IATA_CITY = {
	"LIS": "Lisbon",
	"FUE": "Fuerteventura",
	"LAX": "Los Angeles",
	"SFO": "San Francisco",
	"NYC": "New York",
}

def derive_city_from_iata(iata: str) -> str:
	return _IATA_CITY.get(iata.upper(), iata.upper())


# --------- Email via Resend ---------

# Import the Resend emailer
from emailer_resend import send_email_resend

# Import unified date utilities
from date_utils import generate_affiliate_urls


# --------- Per-alert processing ---------

def process_alert(supabase: Client, alert: dict, good_days: list[str] = None) -> Tuple[bool, Optional[str], Optional[str]]:
	"""Returns (emailed, flight_url, hotel_url)."""
	now = _now_utc()
	alert_id = alert.get("id")
	origin = (alert.get("origin_iata") or "").upper()
	dest = (alert.get("dest_iata") or "").upper()
	depart = str(alert.get("depart_date") or "")
	ret = str(alert.get("return_date") or "") or None
	price_cap = alert.get("max_price_eur")
	user_email = (
		os.getenv("EMAIL_TO")  # override for testing
		or (alert.get("user_email") or alert.get("email") or "")
	).strip()
	print(f"[email] User email: '{user_email}' (from EMAIL_TO env or alert data)")
	print(f"[email] EMAIL_TO env: '{os.getenv('EMAIL_TO', 'NOT_SET')}'")
	print(f"[email] Alert user_email: '{alert.get('user_email', 'NOT_SET')}'")
	print(f"[email] Alert email: '{alert.get('email', 'NOT_SET')}'")

	# Cheapest flight
	print(f"[flight] Searching flights: {origin} → {dest} on {depart} - {ret}")
	offer = amadeus_cheapest_roundtrip(origin, dest, depart, ret, currency="USD")
	if not offer:
		print(f"[flight] No flight offers found for {origin} → {dest}")
		# Write back last_checked_at regardless
		supabase.table("alert_rules").update({"last_checked_at": now.isoformat()}).eq("id", alert_id).execute()
		return (False, None, None)
	
	# Handle both fake and real API response formats
	price_display = offer.get('price') or offer.get('total_usd') or 'N/A'
	total_disp = price_display  # Set total_disp for logging
	print(f"[flight] Found flight: ${price_display} - {offer.get('deep_link', 'No link')}")
	total = float(offer["total_usd"]) if offer.get("total_usd") is not None else None

	# Match logic
	is_match = price_cap is None or (total is not None and total <= float(price_cap))
	print(f"[price] Price cap: {price_cap}, Flight price: {total}, Match: {is_match}")

	# Use the good days from forecast processing instead of cache lookup
	ok_dates = good_days or []
	# For surf trips, we want to cover all eligible days with a minimum 3-day trip
	if ok_dates:
		# Use unified date logic for consistent trip duration
		sub_id = f"alert_{alert_id}"
		dest_iata = alert.get("dest_iata") or alert.get("destination_iata")
		marker = AVIA_AFFILIATE_ID
		
		if ENABLE_AFFILIATES and marker and origin and dest_iata:
			try:
				# Generate affiliate URLs using unified date logic
				flight_url, hotel_url, (departYMD, returnYMD, trip_duration) = generate_affiliate_urls(
					ok_dates, origin, dest_iata, marker, sub_id
				)
				print(f"[affiliate] Generated URLs using unified logic: {trip_duration} days ({departYMD} to {returnYMD})")
			except Exception as e:
				print(f"[affiliate] Error generating unified URLs: {e}, falling back to old logic")
				# Fallback to old logic
				sorted_dates = sorted(ok_dates)
				departYMD = sorted_dates[0]
				min_trip_days = 3
				if len(sorted_dates) >= min_trip_days:
					returnYMD = sorted_dates[-1]
				else:
					start_date = datetime.fromisoformat(departYMD).date()
					end_date = start_date + timedelta(days=min_trip_days - 1)
					returnYMD = end_date.isoformat()
				
				# Use unified affiliate URL generation (same as chips)
				flight_url, hotel_url, (departYMD, returnYMD, trip_duration) = generate_affiliate_urls(
					ok_dates, origin, dest_iata, AVIA_AFFILIATE_ID, f"alert_{alert_id}"
				)
		else:
			# No affiliate setup, use old logic for dates only
			sorted_dates = sorted(ok_dates)
			departYMD = sorted_dates[0]
			min_trip_days = 3
			if len(sorted_dates) >= min_trip_days:
				returnYMD = sorted_dates[-1]
			else:
				start_date = datetime.fromisoformat(departYMD).date()
				end_date = start_date + timedelta(days=min_trip_days - 1)
				returnYMD = end_date.isoformat()
			
			flight_url = offer.get("deep_link")
			hotel_url = None
	else:
		departYMD = alert.get("depart_date")
		returnYMD = alert.get("return_date")
		flight_url = offer.get("deep_link")
		hotel_url = None

	# Cache price data for future quick checks
	if total is not None:
		cache_price_data(supabase, alert, offer, total, now, departYMD, returnYMD)
	
	# Email on match - only log as "sent" when BOTH forecast conditions AND price are satisfied
	print(f"[email] Checking conditions: is_match={is_match}, user_email='{user_email}', will_send={bool(is_match and user_email)}")
	
	# Check if we have good forecast conditions
	has_good_conditions = len(ok_dates) > 0
	print(f"[forecast] Good conditions: {has_good_conditions} ({len(ok_dates)} days), Price match: {is_match}")
	
	# Only log as "sent" when BOTH conditions are met
	if has_good_conditions and is_match:
		print(f"[match] Both forecast and price conditions met - logging as 'sent'")
		# Log the hit event
		try:
			summary_src = f"full_match_{alert_id}|{departYMD}|{returnYMD or ''}|{len(ok_dates)}|{total_disp}"
			summary_hash = hashlib.sha1(summary_src.encode("utf-8")).hexdigest()[:16]
			
			event_row = {
				"rule_id": alert_id,
				"sent_at": now.isoformat(),
				"tier": "test",
				"summary_hash": summary_hash,
				"price": total_disp if total is not None else None,
				"deep_link": flight_url,
				"ok_dates": ok_dates,
				"ok_dates_count": len(ok_dates),
				"snapped_depart_date": departYMD,
				"snapped_return_date": returnYMD,
				"status": "sent",
				"reason": "forecast_and_price_match",
			}
			supabase.table("alert_events").upsert(
				event_row,
				on_conflict="rule_id,summary_hash"
			).execute()
			print(f"[log_event] upserted status=sent rule_id={alert_id}")
		except Exception as e:
			print(f"[log_event] upsert error: {e}")
		
		# Update summary
		try:
			supabase.table("alert_rule_summaries").upsert({
				"rule_id": alert_id,
				"first_ok": ok_dates[0] if ok_dates else None,
				"last_ok": ok_dates[-1] if ok_dates else None,
				"ok_count": len(ok_dates),
			}).execute()
		except Exception as e:
			print(f"[summary] upsert error: {e}")
	elif has_good_conditions and not is_match:
		print(f"[no_match] Good forecast conditions but price too high - logging as 'too_pricey'")
		# Log as "too_pricey" when forecast is good but price doesn't match
		try:
			summary_src = f"no_price_{alert_id}|{departYMD}|{returnYMD or ''}|{len(ok_dates)}|{total_disp}|{price_cap}"
			summary_hash = hashlib.sha1(summary_src.encode("utf-8")).hexdigest()[:16]
			
			event_row = {
				"rule_id": alert_id,
				"sent_at": now.isoformat(),
				"tier": "test",
				"summary_hash": summary_hash,
				"price": total_disp if total is not None else None,
				"deep_link": flight_url,
				"ok_dates": ok_dates,
				"ok_dates_count": len(ok_dates),
				"snapped_depart_date": departYMD,
				"snapped_return_date": returnYMD,
				"status": "too_pricey",
				"reason": f"price too high: ${total_disp} > ${price_cap}" if price_cap else "no price cap set",
			}
			supabase.table("alert_events").upsert(
				event_row,
				on_conflict="rule_id,summary_hash"
			).execute()
			print(f"[log_event] upserted status=too_pricey rule_id={alert_id}")
		except Exception as e:
			print(f"[log_event] upsert error: {e}")
	
	if is_match and user_email:
		# safer display values
		total_disp = 0 if total is None else total
		route_disp = f"{origin} → {dest_iata or 'TBD'}"
		subject = f"Deal {route_disp} — ${round(total_disp)}"
		cta = f'<a href="{flight_url}">Book flight</a>' if flight_url else ""
		hotel = f' &nbsp;|&nbsp; <a href="{hotel_url}">Hotels</a>' if hotel_url else ""
		html = (
			f"<p>Route: {origin} → {dest_iata or 'TBD'}</p>"
			f"<p>Dates: {departYMD}{(' → ' + returnYMD) if returnYMD else ''}</p>"
			f"<p>Cheapest: ${total_disp:.0f}</p>"
			f"<p>{cta}{hotel}</p>"
			"<p style='color:#64748b;font-size:12px'>Links may contain affiliate codes.</p>"
		)
		print(f"[email] Sending to: {user_email}")
		print(f"[email] Subject: {subject}")
		try:
			send_email_resend(
				to_email=user_email,
				subject=subject,
				html=html,
				dry_run=DRY_RUN
			)
			print(f"[email] Sent successfully to {user_email}")
		except Exception as e:
			print("[email] error:", e)
		else:
			# Writebacks on the rule
			supabase.table("alert_rules").update(
				{"last_checked_at": now.isoformat(), "last_notified_at": now.isoformat()}
			).eq("id", alert_id).execute()

			# Upsert event on (rule_id, summary_hash) so repeats update instead of failing
			summary_src = f"{alert_id}|{departYMD}|{returnYMD or ''}|{total_disp}"
			summary_hash = hashlib.sha1(summary_src.encode("utf-8")).hexdigest()[:16]

			# If you track plan tiers elsewhere, swap this placeholder:
			tier_val = "test"  # or "free"/"pro" if you have that context available

			try:
				event_row = {
					"rule_id": alert_id,
					"sent_at": now.isoformat(),
					"tier": tier_val,
					"summary_hash": summary_hash,
					"price": total_disp,
					"deep_link": flight_url,
					"ok_dates": ok_dates,                 # forecast-derived YYYY-MM-DD[]
					"ok_dates_count": len(ok_dates),
					"snapped_depart_date": departYMD,
					"snapped_return_date": returnYMD,
					"status": "sent",
					"reason": "fake_mode" if AMADEUS_MODE == "fake" else "price_match",
				}
				# Supabase-py supports on_conflict for PostgREST UPSERT
				supabase.table("alert_events").upsert(
					event_row,
					on_conflict="rule_id,summary_hash"
				).execute()
			except Exception as e:
				print("[alert_events] upsert error:", e)

			# Upsert compact surf summary (non-fatal on error)
			try:
				supabase.table("alert_rule_summaries").upsert({
					"rule_id": alert_id,
					"first_ok": ok_dates[0] if ok_dates else None,
					"last_ok": ok_dates[-1] if ok_dates else None,
					"ok_count": len(ok_dates),
				}).execute()
			except Exception as e:
				print("[summary] upsert error:", e)

			return (True, flight_url, hotel_url)

	# Not matched: log as "no_surf" if no good conditions found
	if not has_good_conditions:
		print(f"[forecast] No good conditions found - logging as 'no_surf'")
		try:
			summary_src = f"no_surf_{alert_id}|{now.isoformat()}"
			summary_hash = hashlib.sha1(summary_src.encode("utf-8")).hexdigest()[:16]
			
			event_row = {
				"rule_id": alert_id,
				"sent_at": now.isoformat(),
				"tier": "test",
				"summary_hash": summary_hash,
				"price": None,
				"deep_link": None,
				"ok_dates": [],
				"ok_dates_count": 0,
				"snapped_depart_date": None,
				"snapped_return_date": None,
				"status": "no_surf",
				"reason": "no surfable mornings in window",
			}
			supabase.table("alert_events").upsert(
				event_row,
				on_conflict="rule_id,summary_hash"
			).execute()
			print(f"[log_event] upserted status=no_surf rule_id={alert_id}")
		except Exception as e:
			print(f"[log_event] upsert error: {e}")
	
	# Update last_checked_at
	supabase.table("alert_rules").update({"last_checked_at": now.isoformat()}).eq("id", alert_id).execute()
	return (False, flight_url, hotel_url)


# --------- Main ---------

def main():
	assert SUPABASE_URL and SUPABASE_SERVICE_KEY, "Missing Supabase envs"
	sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

	# Debug: Check what forecast data exists (only in debug mode)
	if DEBUG_BYPASS_COOLDOWN:
		print(f"\n🔍 DEBUGGING: Checking available forecast data...")
		try:
			forecast_data = sb.table("forecast_cache").select("spot_id, date, wave_stats, wind_stats").limit(5).execute()
			if forecast_data.data:
				print(f"   Found {len(forecast_data.data)} forecast records:")
				for i, row in enumerate(forecast_data.data[:3]):
					print(f"   Record {i+1}: spot_id={row.get('spot_id')}, date={row.get('date')}")
					print(f"      Wave Stats: {row.get('wave_stats')}")
					print(f"      Wind Stats: {row.get('wind_stats')}")
			else:
				print(f"   No forecast data found in database")
		except Exception as e:
			print(f"   Error checking forecast data: {e}")

	eligible = fetch_eligible_alerts(sb)
	print(f"[core] eligible: {len(eligible)}")
	matched = 0
	emailed = 0
	errors = 0
	for a in eligible:
		try:
			# Check forecast conditions before processing
			forecast_ok, good_days = forecast_ok_daily(sb, a)
			if not forecast_ok:
				print(f"[forecast] rule_id={a['id']} skipped - forecast conditions not met")
				# Log the skip event (use "sent" status to avoid constraint issues)
				try:
					sb.table("alert_events").insert({
						"rule_id": a["id"],
						"sent_at": _now_utc().isoformat(),
						"tier": a.get("tier") or "unknown",
						"summary_hash": hashlib.sha1(f"forecast_skip_{a['id']}".encode("utf-8")).hexdigest()[:16],
						"status": "no_surf",
						"reason": "forecast conditions not met",
						"ok_dates": [],
						"ok_dates_count": 0
					}).execute()
				except Exception as log_err:
					print(f"[forecast] log error: {log_err}")
				# Update last_checked_at
				sb.table("alert_rules").update({"last_checked_at": _now_utc().isoformat()}).eq("id", a["id"]).execute()
				continue
			
			ok, f_url, h_url = process_alert(sb, a, good_days)
			matched += 1 if ok else 0
			emailed += 1 if ok else 0
			if ok:
				print(f"[email/url] flight={f_url} hotel={h_url}")
		except Exception as e:
			errors += 1
			print("[alert] error:", e)

	# Cost monitoring
	amadeus_calls = 0
	email_sends = 0
	for alert in eligible:
		if alert.get("spot_id"):  # Only count if we actually process the alert
			amadeus_calls += 1
	# Email sends are tracked by the 'emailed' variable
	email_sends = emailed
	
	print(f"[core] done — eligible={len(eligible)} matched={matched} emailed={emailed} errors={errors}")
	print(f"[cost] Amadeus calls: {amadeus_calls}, Email sends: {email_sends}")
	print(f"[cost] Estimated cost: ${amadeus_calls * 0.01:.2f} (Amadeus) + ${email_sends * 0.001:.3f} (Email)")


def cache_price_data(supabase: Client, alert: dict, offer: dict, total: float, now: datetime, depart_date: str, return_date: str):
	"""Cache price data for future quick checks"""
	try:
		spot_id = alert.get("spot_id")
		if not spot_id:
			print("[cache] No spot_id - skipping price cache")
			return
		
		origin = alert.get("origin_iata", "")
		dest = alert.get("dest_iata", "")
		
		# Skip caching if essential data is missing
		if not depart_date or not return_date:
			print(f"[cache] Missing dates - skipping price cache (depart: {depart_date}, return: {return_date})")
			return
		
		# Use Aviasales for flight bookings (not Amadeus direct link)
		# Generate Aviasales URL with proper affiliate tracking (DDMM format)
		depart_ddmm = f"{depart_date.split('-')[2]}{depart_date.split('-')[1]}"  # DDMM
		return_ddmm = f"{return_date.split('-')[2]}{return_date.split('-')[1]}"  # DDMM
		affiliate_link = f"https://aviasales.com/search/{origin}{depart_ddmm}{dest}{return_ddmm}?marker=670448&sub_id=alert_{alert.get('id', 'unknown')}"
		
		# Convert USD to EUR (rough conversion)
		price_eur = total * 0.85  # Approximate USD to EUR conversion
		
		# Generate Hotellook URL for hotel bookings (direct affiliate link)
		hotel_url = f"https://search.hotellook.com/?destination={dest}&checkIn={depart_date}&checkOut={return_date}&adults=1&rooms=1&children=0&locale=en&currency=USD&marker=670448&sub_id=alert_{alert.get('id', 'unknown')}"
		
		# Cache the price data
		cache_data = {
			"spot_id": spot_id,
			"origin_iata": origin,
			"dest_iata": dest,
			"price_eur": price_eur,
			"affiliate_link": affiliate_link,
			"hotel_link": hotel_url,
			"cached_at": now.isoformat(),
			"expires_at": (now + timedelta(hours=24)).isoformat()
		}
		
		print(f"[cache] Caching price data: {origin}→{dest} €{price_eur:.2f}")
		
		# Insert price cache data (simple insert for now)
		try:
			supabase.table("price_cache").insert(cache_data).execute()
		except Exception as insert_error:
			print(f"[cache] Insert failed: {insert_error}")
			return
		
		print(f"[cache] Price data cached successfully")
		
	except Exception as e:
		print(f"[cache] Error caching price data: {e}")


if __name__ == "__main__":
	main()

