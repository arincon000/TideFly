import os
import json
import time
import hashlib
from datetime import datetime, timedelta, timezone, date
from typing import Optional, Tuple, List, Dict

import requests
from supabase import create_client, Client

from dotenv import load_dotenv
import pathlib
load_dotenv(pathlib.Path(__file__).resolve().parents[1] / ".env.local", override=True)


# --------- ENV ---------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
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
# keep your existing AMADEUS_ENV logic as-is (defaults to test)

# --------- Helpers ---------

def _now_utc() -> datetime:
	return datetime.now(timezone.utc)


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
	res = supabase.schema("api").table("v1_alert_rules").select("*").execute()
	rows = res.data or []
	eligible: List[Dict] = []
	for r in rows:
		if not r.get("is_active"):
			continue
		pu = r.get("paused_until")
		if pu:
			try:
				pu_dt = datetime.fromisoformat(str(pu).replace("Z", "+00:00"))
			except Exception:
				pu_dt = None
			if pu_dt and pu_dt > now:
				continue
		last_checked = r.get("last_checked_at")
		try:
			last_checked_dt = datetime.fromisoformat(str(last_checked).replace("Z", "+00:00")) if last_checked else datetime.fromtimestamp(0, tz=timezone.utc)
		except Exception:
			last_checked_dt = datetime.fromtimestamp(0, tz=timezone.utc)
		cool = int(r.get("cooldown_hours") or 24)
		if last_checked_dt + timedelta(hours=cool) > now:
			continue
		eligible.append(r)
	# Order by created_at asc (best-effort)
	eligible.sort(key=lambda x: str(x.get("created_at") or ""))
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
	url = f"https://aviasales.com/search/{out}{rt}?marker={requests.utils.quote(marker)}"
	if sub_id:
		url += f"&sub_id={requests.utils.quote(sub_id)}"
	return url


def build_hotel_link_hotellook(city: str, checkin_ymd: str, checkout_ymd: str, sub_id: str) -> Optional[str]:
	if not (ENABLE_AFFILIATES and ENABLE_HOTEL_CTA):
		return None
	marker = AVIA_AFFILIATE_ID
	if not (marker and city and checkin_ymd and checkout_ymd):
		return None
	h = requests.PreparedRequest()
	h.prepare_url(
		"https://search.hotellook.com/",
		{
			"destination": city,
			"checkIn": checkin_ymd,
			"checkOut": checkout_ymd,
			"adults": "1",
			"rooms": "1",
			"children": "0",
			"locale": "en",
			"currency": "USD",
		},
	)
	tp = requests.PreparedRequest()
	params = {"marker": marker, "p": TP_P_HOTELLOOK, "u": h.url}
	if sub_id:
		params["sub_id"] = sub_id
	tp.prepare_url("https://tp.media/r", params)
	return tp.url


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


# --------- Email via SendGrid ---------

def send_email_sendgrid(to_email: str, subject: str, html: str) -> None:
	if DRY_RUN:
		print(f"[dry-run email] to={to_email} :: {subject}")
		return
	if not SENDGRID_API_KEY:
		print(f"[dry-email] {to_email} :: {subject}")
		return
	from sendgrid import SendGridAPIClient
	from sendgrid.helpers.mail import Mail
	sender = os.getenv("EMAIL_FROM", "alerts@tidefly.app")
	SendGridAPIClient(SENDGRID_API_KEY).send(
		Mail(from_email=sender, to_emails=to_email, subject=subject, html_content=html)
	)


# --------- Per-alert processing ---------

def process_alert(supabase: Client, alert: dict) -> Tuple[bool, Optional[str], Optional[str]]:
	"""Returns (emailed, flight_url, hotel_url)."""
	now = _now_utc()
	alert_id = alert.get("id")
	origin = (alert.get("origin_iata") or "").upper()
	dest = (alert.get("dest_iata") or "").upper()
	depart = str(alert.get("depart_date") or "")
	ret = str(alert.get("return_date") or "") or None
	price_cap = alert.get("price_max_usd")
	user_email = (
		os.getenv("EMAIL_TO")  # override for testing
		or (alert.get("user_email") or alert.get("email") or "")
	).strip()

	# Cheapest flight
	offer = amadeus_cheapest_roundtrip(origin, dest, depart, ret, currency="USD")
	if not offer:
		# Write back last_checked_at regardless
		supabase.table("alert_rules").update({"last_checked_at": now.isoformat()}).eq("id", alert_id).execute()
		return (False, None, None)
	total = float(offer["total_usd"]) if offer.get("total_usd") is not None else None

	# Match logic
	is_match = price_cap is None or (total is not None and total <= float(price_cap))

	# Build affiliates
	sub_id = f"alert_{alert_id}"
	flight_url = build_flight_link_aviasales(origin, dest, depart, ret, sub_id) or offer.get("deep_link")
	hotel_url = None
	if ret:
		city = derive_city_from_iata(dest)
		hotel_url = build_hotel_link_hotellook(city, depart, ret, sub_id)

	# Email on match
	if is_match and user_email:
		# safer display values
		total_disp = 0 if total is None else total
		route_disp = f"{origin} → {dest or 'TBD'}"
		subject = f"Deal {route_disp} — ${round(total_disp)}"
		cta = f'<a href="{flight_url}">Book flight</a>' if flight_url else ""
		hotel = f' &nbsp;|&nbsp; <a href="{hotel_url}">Hotels</a>' if hotel_url else ""
		html = (
			f"<p>Route: {origin} → {dest or 'TBD'}</p>"
			f"<p>Dates: {depart}{(' → ' + ret) if ret else ''}</p>"
			f"<p>Cheapest: ${total_disp:.0f}</p>"
			f"<p>{cta}{hotel}</p>"
			"<p style='color:#64748b;font-size:12px'>Links may contain affiliate codes.</p>"
		)
		try:
			send_email_sendgrid(user_email, subject, html)
		except Exception as e:
			print("[email] error:", e)
		else:
			# Writebacks on the rule
			supabase.table("alert_rules").update(
				{"last_checked_at": now.isoformat(), "last_notified_at": now.isoformat()}
			).eq("id", alert_id).execute()

			# --- Log into public.alert_events (existing table) ---
			# Required columns: rule_id (uuid), sent_at (timestamptz), tier (text),
			# summary_hash (text), ok_dates (ARRAY), plus optional: price, deep_link, status, reason, ok_dates_count.
			ok_dates = [depart] + ([ret] if ret else [])
			summary_src = f"{alert_id}|{depart}|{ret or ''}|{total_disp}"
			summary_hash = hashlib.sha1(summary_src.encode("utf-8")).hexdigest()[:16]

			# If you track plan tiers elsewhere, swap this placeholder:
			tier_val = "test"  # or "free"/"pro" if you have that context available

			try:
				supabase.table("alert_events").insert({
					"rule_id": alert_id,
					"sent_at": now.isoformat(),
					"tier": tier_val,
					"summary_hash": summary_hash,
					"price": total_disp,
					"deep_link": flight_url,
					"ok_dates": ok_dates,                 # date[] or text[] — ISO strings are fine
					"ok_dates_count": len(ok_dates),
					"status": "sent",
					"reason": "fake_mode" if AMADEUS_MODE == "fake" else "price_match",
				}).execute()
			except Exception as e:
				print("[alert_events] insert error:", e)

			return (True, flight_url, hotel_url)

	# Not matched: only last_checked_at
	supabase.table("alert_rules").update({"last_checked_at": now.isoformat()}).eq("id", alert_id).execute()
	return (False, flight_url, hotel_url)


# --------- Main ---------

def main():
	assert SUPABASE_URL and SUPABASE_SERVICE_KEY, "Missing Supabase envs"
	sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

	eligible = fetch_eligible_alerts(sb)
	print(f"[core] eligible: {len(eligible)}")
	matched = 0
	emailed = 0
	errors = 0
	for a in eligible:
		try:
			ok, f_url, h_url = process_alert(sb, a)
			matched += 1 if ok else 0
			emailed += 1 if ok else 0
			if ok:
				print(f"[email/url] flight={f_url} hotel={h_url}")
		except Exception as e:
			errors += 1
			print("[alert] error:", e)

	print(f"[core] done — eligible={len(eligible)} matched={matched} emailed={emailed} errors={errors}")


if __name__ == "__main__":
	main()

