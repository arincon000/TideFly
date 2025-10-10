#!/usr/bin/env python3
"""
Populate Hotellook city IDs for airport cities based on primary IATA.

Reads: spots_upload_fixed.csv (must contain primary_airport_iata)
Writes: spots_upload_fixed.csv (in-place update) with new column 'hotellook_city_id_airport'

Strategy:
1) Map IATA -> City name via Travelpayouts autocomplete (public endpoint)
2) Map City name -> Hotellook cityId via Hotellook lookup (public endpoint)
3) Cache results in hl_airport_city_cache.json to avoid re-queries

Notes:
- If lookup fails, leaves the field empty.
- Verbose progress prints.
"""
import csv
import json
import os
import sys
import time
import argparse
import re
from typing import Dict, Tuple, Optional, List

import requests


def browser_headers() -> Dict[str, str]:
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Referer": "https://search.hotellook.com/",
    }

CACHE_PATH = "hl_airport_city_cache.json"
INPUT = "spots_upload_fixed.csv"
AIRPORTS_CSV = "airports_dataset.csv"
# Debug flag for Hotellook resolver
HL_DEBUG = os.getenv("HL_DEBUG", "").lower() in ("1", "true", "yes")

# Manual overrides for tricky IATAs
IATA_OVERRIDES: Dict[str, Tuple[str, str]] = {
    "BWX": ("Banyuwangi", "Indonesia"),
    # Expanded known tricky mappings (military/municipal, ambiguous names)
    "NKX": ("San Diego", "United States"),   # MCAS Miramar → San Diego
    "PNS": ("Pensacola", "United States"),
    "ACY": ("Atlantic City", "United States"),
    "CHS": ("Charleston", "United States"),
    "ITO": ("Hilo", "United States"),        # Hawaii Island
    "DNA": ("Okinawa", "Japan"),             # Kadena AB (near Chatan/Okinawa)
    "MYR": ("Myrtle Beach", "United States"),
    "WVI": ("Watsonville", "United States"),
    "OCE": ("Ocean City", "United States"),
    "MJX": ("Toms River", "United States"),   # Ocean County
    "NTU": ("Virginia Beach", "United States"),
    "NPT": ("Newport", "United States"),
    "PDM": ("Pedasí", "Panama"),            # Pedasi
    "JFM": ("Fremantle", "Australia"),       # Fremantle Heliport
    "SDB": ("Langebaan", "South Africa"),    # Langebaanweg AFB area
}

# Country alias map to improve Hotellook matching
COUNTRY_ALIASES: Dict[str, Tuple[str, ...]] = {
    "United States": ("USA", "US", "United States of America", "U.S.A.", "U.S."),
    "United Kingdom": ("UK", "Great Britain"),
    "Republic of the Congo": ("Congo",),
    "Congo": ("Congo",),
    "Congo (Democratic Republic)": ("DR Congo", "Congo (Kinshasa)", "Democratic Republic of the Congo"),
    "South Korea": ("Korea, Republic of",),
    "North Korea": ("Korea, Democratic People's Republic",),
    "Czech Republic": ("Czechia",),
    "Ivory Coast": ("Cote d'Ivoire",),
    "United Arab Emirates": ("UAE",),
    "Russia": ("Russian Federation",),
    "Cape Verde": ("Cabo Verde",),
}

# Minimal ISO country code to English names (extend as needed)
ISO_TO_COUNTRY: Dict[str, str] = {
    "US": "United States",
    "CA": "Canada",
    "GB": "United Kingdom",
    "FR": "France",
    "DE": "Germany",
    "ES": "Spain",
    "PT": "Portugal",
    "IT": "Italy",
    "NL": "Netherlands",
    "BE": "Belgium",
    "IE": "Ireland",
    "CH": "Switzerland",
    "SE": "Sweden",
    "NO": "Norway",
    "DK": "Denmark",
    "FI": "Finland",
    "IS": "Iceland",
    "GR": "Greece",
    "TR": "Turkey",
    "RU": "Russia",
    "UA": "Ukraine",
    "PL": "Poland",
    "CZ": "Czech Republic",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "HR": "Croatia",
    "BA": "Bosnia and Herzegovina",
    "ME": "Montenegro",
    "AL": "Albania",
    "MK": "North Macedonia",
    "BG": "Bulgaria",
    "RO": "Romania",
    "HU": "Hungary",
    "AT": "Austria",
    "AR": "Argentina",
    "BR": "Brazil",
    "CL": "Chile",
    "CO": "Colombia",
    "EC": "Ecuador",
    "MX": "Mexico",
    "PE": "Peru",
    "UY": "Uruguay",
    "VE": "Venezuela",
    "AU": "Australia",
    "NZ": "New Zealand",
    "JP": "Japan",
    "CN": "China",
    "KR": "South Korea",
    "ID": "Indonesia",
    "MY": "Malaysia",
    "TH": "Thailand",
    "VN": "Vietnam",
    "PH": "Philippines",
    "IN": "India",
    "AE": "United Arab Emirates",
    "SA": "Saudi Arabia",
    "QA": "Qatar",
    "OM": "Oman",
    "BH": "Bahrain",
    "KW": "Kuwait",
    "IL": "Israel",
    "JO": "Jordan",
    "LB": "Lebanon",
    "EG": "Egypt",
    "MA": "Morocco",
    "TN": "Tunisia",
    "ZA": "South Africa",
    "TZ": "Tanzania",
    "KE": "Kenya",
    "NG": "Nigeria",
    "GH": "Ghana",
    "PR": "Puerto Rico",
}

# Build reverse alias → canonical map
ALIAS_TO_COUNTRY: Dict[str, str] = {}
for canonical, aliases in COUNTRY_ALIASES.items():
    for a in aliases:
        ALIAS_TO_COUNTRY[a.lower()] = canonical
ALIAS_TO_COUNTRY.update({
    "usa": "United States",
    "us": "United States",
    "england": "United Kingdom",
})

# Lazy-initialized; set in main when needed
AIRPORT_MAP: Dict[str, Tuple[str, str]] = {}


def ensure_airports_dataset() -> Dict[str, Tuple[str, str]]:
    """Download and index an airports dataset mapping code -> (city,country)."""
    if not os.path.exists(AIRPORTS_CSV):
        try:
            print("Downloading airports dataset...", flush=True)
            r = requests.get("https://ourairports.com/data/airports.csv", timeout=60)
            r.raise_for_status()
            with open(AIRPORTS_CSV, "wb") as f:
                f.write(r.content)
        except Exception:
            print("Warning: failed to download airports dataset.")
            return {}
    mapping: Dict[str, Tuple[str, str]] = {}
    try:
        with open(AIRPORTS_CSV, "r", encoding="utf-8") as f:
            import csv as _csv
            reader = _csv.DictReader(f)
            for row in reader:
                code_iata = (row.get("iata_code") or "").strip().upper()
                code_ident = (row.get("ident") or "").strip().upper()
                code_local = (row.get("local_code") or "").strip().upper()
                city = (row.get("municipality") or row.get("city") or "").strip()
                iso = (row.get("iso_country") or "").strip().upper()
                country = ISO_TO_COUNTRY.get(iso, iso)
                if city:
                    if code_iata:
                        mapping[code_iata] = (city, country)
                    if code_ident and code_ident not in mapping:
                        mapping[code_ident] = (city, country)
                    if code_local and code_local not in mapping:
                        mapping[code_local] = (city, country)
    except Exception:
        pass
    return mapping


def http_get_json(url: str, params: Dict[str, str], timeout: int = 20) -> Optional[dict]:
    try:
        # Use browser-like headers for endpoints that may filter non-browser clients
        headers = browser_headers() if "hotellook" in url else {}
        # include affiliate marker to reduce filtering
        if "hotellook" in url and "marker" not in params:
            params = {**params, "marker": "670448"}
        r = requests.get(url, params=params, timeout=timeout, headers=headers)
        r.raise_for_status()
        # Some endpoints return JSON with wrong content-type; attempt json parse with fallback
        try:
            return r.json()
        except Exception:
            text = r.text.strip()
            if text.startswith("{") or text.startswith("["):
                return json.loads(text)
            return None
    except Exception:
        return None


def resolve_city_from_iata(iata: str) -> Optional[Tuple[str, str]]:
    """Use Travelpayouts autocomplete to resolve IATA airport to (city_name, country_name)."""
    if not iata:
        return None
    # Prefer dataset mapping if available
    if AIRPORT_MAP:
        hit = AIRPORT_MAP.get(iata.upper())
        if hit:
            return hit
    data = http_get_json(
        "https://autocomplete.travelpayouts.com/places2",
        {"term": iata, "locale": "en", "types[]": ["airport", "city"]},
    )
    if not data:
        return None
    # Find airport with exact code match
    iata_upper = iata.upper()
    airport = next((x for x in data if x.get("type") == "airport" and x.get("code") == iata_upper), None)
    if not airport:
        # try city direct
        city = next((x for x in data if x.get("type") == "city"), None)
        if city:
            return city.get("name"), city.get("country_name") or ""
        return None
    city_name = airport.get("city_name") or airport.get("name")
    country_name = airport.get("country_name") or ""
    if not city_name:
        return None
    return city_name, country_name


def resolve_hotellook_city_id(city: str, country: str = "") -> Optional[int]:
    """Use Hotellook lookup to get cityId by name (optionally with country)."""
    if not city:
        return None

    def parse_candidates(payload) -> List[dict]:
        candidates: List[dict] = []
        if isinstance(payload, list):
            candidates.extend(payload)
        elif isinstance(payload, dict):
            if "results" in payload and isinstance(payload["results"], dict):
                for key in ("locations", "cities", "hotels"):
                    val = payload["results"].get(key)
                    if isinstance(val, list):
                        candidates.extend(val)
            for key in ("cities", "locations"):
                if key in payload and isinstance(payload[key], list):
                    candidates.extend(payload[key])
        return candidates

    # Build a list of queries to try
    queries = []
    if country:
        queries.append(f"{city}, {country}")
        for alias in COUNTRY_ALIASES.get(country, ()):  # type: ignore
            queries.append(f"{city}, {alias}")
    queries.append(city)

    # Different API parameter variants to try
    param_variants = [
        {"lang": "en", "lookFor": "city", "limit": "10"},
        {"lang": "en", "lookFor": "both", "limit": "10"},
        {"lang": "en", "limit": "10"},
    ]
    # Domains to try (some environments block engine.hotellook.com)
    base_urls = [
        "https://engine.hotellook.com/api/v2/lookup.json",
        "https://search.hotellook.com/api/v2/lookup.json",
    ]

    for q in queries:
        for params in param_variants:
            payload = None
            last_url = None
            for url in base_urls:
                last_url = url
                payload = http_get_json(url, {"query": q, **params})
                if payload:
                    break
            if not payload:
                if HL_DEBUG:
                    try:
                        print(f"[HL_DEBUG] Empty payload for query='{q}' params={params} last_url={last_url}")
                    except Exception:
                        pass
                continue
            candidates = parse_candidates(payload)
            if not candidates:
                if HL_DEBUG:
                    try:
                        print(f"[HL_DEBUG] No candidates parsed for query='{q}' payload keys={list(payload.keys()) if isinstance(payload, dict) else type(payload)}")
                    except Exception:
                        pass
                continue
            # Prefer exact/contains match on city name
            for c in candidates:
                cid = c.get("cityId") or c.get("id")
                name = c.get("fullname") or c.get("name") or ""
                if not cid:
                    continue
                try:
                    cid_int = int(cid)
                except Exception:
                    continue
                # Normalize both strings for comparison
                name_norm = (name or "").lower()
                city_norm = (city or "").lower()
                if city_norm == name_norm or city_norm in name_norm:
                    return cid_int
            # Fallback to first candidate with an id
            for c in candidates:
                cid = c.get("cityId") or c.get("id")
                if not cid:
                    continue
                try:
                    return int(cid)
                except Exception:
                    continue
    return None


def ascii_fold(text: str) -> str:
    try:
        return (text or "").encode("ascii", "ignore").decode("ascii")
    except Exception:
        return text or ""


def maybe_ai_airport_city_candidates(iata: str, row: Dict[str, str], api_key: str) -> Optional[Tuple[List[str], str]]:
    """Use OpenAI to return ordered city candidates for the airport (municipality → primary → metro).
    Returns (cities, country).
    Strongly prefers the smallest administrative city actually served by the airport (e.g., Pedasí for PDM; Fremantle for JFM).
    """
    if not api_key:
        return None
    try:
        spot_name = row.get("full_location_name", "")
        country_hint = row.get("country_clean", "")
        prompt = (
            "Task: Given a 3-letter IATA airport code, output the best city names to use for hotel searches, in priority order.\n"
            "Policy:\n"
            "- Prefer the airport's municipality/town first (smallest city actually served).\n"
            "- Only fall back to the larger metro/capital if the airport itself is inside that city.\n"
            "- Avoid generic metro substitutions when the airport is in a distinct town (e.g., do NOT map PDM to Panama City; use Pedasí).\n"
            "- Output a SHORT ordered list of 1–3 city candidates, most specific first.\n"
            "- Include a single country name for all candidates.\n"
            "Format strictly as JSON: {\"country\": \"...\", \"cities\": [\"...\", \"...\"]}.\n"
            "Examples (MUST follow these preferences):\n"
            "- IATA: PDM → {country: 'Panama', cities: ['Pedasí','Las Tablas','Panama City']}\n"
            "- IATA: JFM → {country: 'Australia', cities: ['Fremantle','Perth']}\n"
            "- IATA: NKX → {country: 'United States', cities: ['San Diego']}\n"
            "- IATA: ITO → {country: 'United States', cities: ['Hilo']}\n"
            "Input context (may help disambiguate):\n"
            f"- IATA: {iata}\n- Spot: {spot_name}\n- Country hint: {country_hint}\n"
            "Now respond with ONLY the JSON object."
        )
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a precise travel data normalizer. Always return valid JSON and follow the municipality-first rule."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0,
            },
            timeout=30,
        )
        r.raise_for_status()
        txt = r.json()["choices"][0]["message"]["content"].strip()
        try:
            data = json.loads(txt)
        except Exception:
            m = re.search(r"\{.*\}", txt, flags=re.S)
            if not m:
                return None
            try:
                data = json.loads(m.group(0))
            except Exception:
                return None
        country = (data.get("country") or "").strip()
        if country:
            country = ALIAS_TO_COUNTRY.get(country.lower(), country)
        cities = data.get("cities") or []
        if not isinstance(cities, list):
            return None
        clean_cities: List[str] = []
        for c in cities:
            name = (c or "").strip()
            if not name:
                continue
            if name not in clean_cities:
                clean_cities.append(name)
        return (clean_cities, country)
    except Exception:
        return None


def derive_city_from_airport_name(name: str) -> Optional[str]:
    if not name:
        return None
    raw = name.strip()
    # Remove common suffixes indicating facility type
    raw = re.sub(r"\b(International|Intl\.?|Airport|Aerodrome|Airfield|Heliport|Naval Air Station|NAS|AFB|Air Force Base)\b", "", raw, flags=re.I).strip()
    # If pattern like "Langebaanweg", try removing Afrikaans "-weg" to get base town name
    if raw.lower().endswith("weg") and len(raw) > 3:
        base = raw[:-3]
        # Handle trailing spaces or hyphens
        base = re.sub(r"[-\s]+$", "", base)
        if base:
            return base
    # If contains comma, take first component
    if "," in raw:
        candidate = raw.split(",")[0].strip()
        if candidate:
            return candidate
    # If contains parentheses, remove
    raw = re.sub(r"\s*\(.*?\)\s*", " ", raw).strip()
    # Keep first two words max to avoid facility remnants
    tokens = raw.split()
    if tokens:
        return " ".join(tokens[:3]).strip()
    return None


def maybe_ai_airport_details(iata: str, row: Dict[str, str], api_key: str) -> Optional[dict]:
    """Use AI to obtain official airport name, municipality/town, country, and 1–3 city candidates.
    Returns a dict: {airport_name, municipality, country, cities: [..]}"""
    if not api_key:
        return None
    try:
        spot_name = row.get("full_location_name", "")
        country_hint = row.get("country_clean", "")
        prompt = (
            "You normalize airport data precisely. Given a 3-letter IATA code, return the official airport name, the municipality/town the airport is in (very specific), the country, and an ordered list of 1–3 city names for hotel searches.\n"
            "Rules:\n"
            "- City candidates must be in priority order: municipality first; then primary city if different; then metro only if truly appropriate.\n"
            "- Avoid overreaching to regional metros: e.g., PDM is Pedasí (not Panama City); JFM is Fremantle (not Perth); SDB is Langebaan/Langebaanweg area (not Cape Town).\n"
            "- Keep names short, human city names only (no base names like 'Air Force Base').\n"
            "Output STRICT JSON with keys: airport_name, municipality, country, cities.\n"
            "Good examples you must emulate:\n"
            "- IATA: PDM → {airport_name:'Pedasí Airport', municipality:'Pedasí', country:'Panama', cities:['Pedasí','Las Tablas']}\n"
            "- IATA: JFM → {airport_name:'Fremantle Heliport', municipality:'Fremantle', country:'Australia', cities:['Fremantle','Perth']}\n"
            "- IATA: SDB → {airport_name:'Langebaanweg Air Force Base', municipality:'Langebaanweg', country:'South Africa', cities:['Langebaan','Langebaanweg']}\n"
            f"Context: IATA={iata}; Spot='{spot_name}'; CountryHint='{country_hint}'. Return ONLY the JSON."
        )
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Always output valid compact JSON and follow municipality-first ordering."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0,
            },
            timeout=30,
        )
        r.raise_for_status()
        txt = r.json()["choices"][0]["message"]["content"].strip()
        try:
            data = json.loads(txt)
        except Exception:
            m = re.search(r"\{.*\}", txt, flags=re.S)
            if not m:
                return None
            data = json.loads(m.group(0))
        # Normalize
        airport_name = (data.get("airport_name") or "").strip()
        municipality = (data.get("municipality") or "").strip()
        country = (data.get("country") or "").strip()
        if country:
            country = ALIAS_TO_COUNTRY.get(country.lower(), country)
        cities = data.get("cities") or []
        if not isinstance(cities, list):
            cities = []
        clean_cities: List[str] = []
        for c in cities:
            cc = (c or "").strip()
            if cc and cc not in clean_cities:
                clean_cities.append(cc)
        # Heuristic from airport name and municipality
        derived = []
        for source in [municipality, derive_city_from_airport_name(airport_name)]:
            s = (source or "").strip()
            if s and s not in clean_cities and s not in derived:
                derived.append(s)
            # Afrikaans "-weg" to base
            if s.lower().endswith("weg"):
                base = re.sub(r"[-\s]*weg$", "", s, flags=re.I)
                base = base.strip()
                if base and base not in clean_cities and base not in derived:
                    derived.append(base)
        all_candidates = []
        for n in (derived + clean_cities):
            if n and n not in all_candidates:
                all_candidates.append(n)
        return {"airport_name": airport_name, "municipality": municipality, "country": country, "cities": all_candidates}
    except Exception:
        return None


def resolve_hotellook_city_id_with_candidates(cities: List[str], country: str) -> Optional[int]:
    for name in cities:
        # Try original and ascii-folded versions
        for variant in [name, ascii_fold(name)]:
            cid = resolve_hotellook_city_id(variant, country)
            if cid:
                return cid
    return None


def maybe_ai_guess_city(iata: str, row: Dict[str, str], api_key: str) -> Optional[Tuple[str, str]]:
    """Use OpenAI to guess correct city and country for an airport IATA.
    Returns (city, country) or None.
    """
    if not api_key:
        return None
    try:
        prompt = (
            "You are a travel data normalizer. Given an airport IATA code, return the main city and country for hotel search.\n"
            "Respond strictly as JSON: {\"city\": \"...\", \"country\": \"...\"}.\n"
            f"IATA: {iata}.\n"
            f"Spot name: {row.get('full_location_name','')}\n"
            f"Country hint: {row.get('country_clean','')}\n"
        )
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
            },
            timeout=30,
        )
        r.raise_for_status()
        txt = r.json()["choices"][0]["message"]["content"].strip()
        # Robust JSON extraction
        try:
            data = json.loads(txt)
        except Exception:
            m = re.search(r"\{.*\}", txt, flags=re.S)
            if not m:
                return None
            try:
                data = json.loads(m.group(0))
            except Exception:
                return None
        city = (data.get("city") or "").strip()
        country = (data.get("country") or "").strip()
        if country:
            # normalize alias to canonical
            country = ALIAS_TO_COUNTRY.get(country.lower(), country)
        if city:
            return city, country
        return None
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ai", action="store_true")
    parser.add_argument("--ai-only", action="store_true", help="Only use AI to map IATA→city,country; skip datasets and autocomplete APIs")
    parser.add_argument("--api-key", dest="api_key", default=os.getenv("OPENAI_API_KEY", ""))
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--only-missing", action="store_true", help="process only rows missing hotellook_city_id_airport")
    parser.add_argument("--limit", type=int, default=0, help="process only the first N rows")
    parser.add_argument("--dry-run", action="store_true", help="do not write CSV back; print results only")
    args = parser.parse_args()
    # If ai-only, imply --ai and require an API key
    if args.ai_only:
        args.ai = True
        if not args.api_key:
            print("Error: --ai-only requires an OpenAI API key (set --api-key or OPENAI_API_KEY).", flush=True)
            sys.exit(1)
    # Initialize airports dataset only when not in ai-only mode
    global AIRPORT_MAP
    AIRPORT_MAP = {}
    if not args.ai_only:
        AIRPORT_MAP = ensure_airports_dataset()
    # Load cache
    cache: Dict[str, Dict[str, str]] = {}
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}

    with open(INPUT, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    fieldnames = list(reader.fieldnames or [])
    if "hotellook_city_id_airport" not in fieldnames:
        fieldnames.append("hotellook_city_id_airport")

    updated = 0
    total = len(rows)
    print(f"Processing {total} rows ...", flush=True)

    for idx, row in enumerate(rows, 1):
        if args.limit and idx > args.limit:
            break
        iata = (row.get("primary_airport_iata") or row.get("dest_iata") or "").strip()
        if not iata:
            continue
        if args.only_missing and row.get("hotellook_city_id_airport"):
            continue

        # Cache key
        ck = iata.upper()

        # Manual overrides first
        if ck in IATA_OVERRIDES:
            city_name, country_name = IATA_OVERRIDES[ck]
            city_id = resolve_hotellook_city_id(city_name, country_name)
            if city_id:
                row["hotellook_city_id_airport"] = str(city_id)
                cache[ck] = {"city": city_name, "country": country_name, "city_id": city_id}
                updated += 1
                print(f"[{idx}/{total}] {ck} -> {city_name}, {country_name} -> {city_id} (override)")
                continue

        cached = cache.get(ck)
        if cached and cached.get("city_id"):
            row["hotellook_city_id_airport"] = str(cached["city_id"])
            updated += 1
            if idx % 50 == 0:
                print(f"[{idx}/{total}] {iata} -> {cached['city_id']} (cache)")
            continue

        # Resolve city name from IATA
        res = None
        ai_cities: List[str] = []
        country_name = ""
        if args.ai_only:
            ai_pack = maybe_ai_airport_city_candidates(iata, row, args.api_key)
            # Also fetch detailed airport info to derive city from airport name
            details = maybe_ai_airport_details(iata, row, args.api_key)
            if ai_pack:
                ai_cities, country_name = ai_pack
            if details:
                country_name = details.get("country") or country_name
                extra_cities = details.get("cities") or []
                for c in extra_cities:
                    if c not in ai_cities:
                        ai_cities.append(c)
        else:
            res = resolve_city_from_iata(iata)
            if res:
                city_name, country_name = res
                ai_cities = [city_name]
            if not ai_cities and args.ai and args.api_key:
                ai_pack = maybe_ai_airport_city_candidates(iata, row, args.api_key)
                if ai_pack:
                    ai_cities, country_name = ai_pack
                details = maybe_ai_airport_details(iata, row, args.api_key)
                if details:
                    country_name = details.get("country") or country_name
                    for c in (details.get("cities") or []):
                        if c not in ai_cities:
                            ai_cities.append(c)
        if not ai_cities:
            if args.verbose or (idx % 50 == 0):
                print(f"[{idx}/{total}] {iata} -> city not found")
            continue
        if args.verbose:
            try:
                print(f"[{idx}/{total}] {iata} candidates: {ai_cities} | country: {country_name}")
            except Exception:
                pass

        # Resolve hotellook city id (try candidates in order)
        city_id = resolve_hotellook_city_id_with_candidates(ai_cities, country_name)
        # If still not found and AI allowed, attempt a second pass with fallback cities (e.g., add metro if missing)
        if not city_id and args.ai and args.api_key:
            # As a conservative fallback, try adding a metro guess via the simpler model
            ai_guess = maybe_ai_guess_city(iata, row, args.api_key)
            if ai_guess:
                ai_city, ai_country = ai_guess
                extra_cities = [ai_city] if ai_city else []
                if args.verbose and extra_cities:
                    print(f"[{idx}/{total}] {iata} secondary guess: {extra_cities} | country: {ai_country or country_name}")
                city_id = resolve_hotellook_city_id_with_candidates(extra_cities, ai_country or country_name)
            if not city_id:
                # One more pass: derive from airport name
                details = maybe_ai_airport_details(iata, row, args.api_key)
                if details:
                    extra = details.get("cities") or []
                    if args.verbose and extra:
                        print(f"[{idx}/{total}] {iata} details-derived: {extra} | country: {details.get('country') or country_name}")
                    if extra:
                        city_id = resolve_hotellook_city_id_with_candidates(extra, details.get("country") or country_name)

        if city_id:
            row["hotellook_city_id_airport"] = str(city_id)
            # Cache the first candidate for transparency
            cache[ck] = {"city": ai_cities[0], "country": country_name, "city_id": city_id}
            updated += 1
            if args.verbose or (idx % 1 == 0 and idx <= 50) or (idx % 50 == 0):
                source = "ai-only" if args.ai_only else ("ai" if args.ai else "api")
                print(f"[{idx}/{total}] {iata} -> {ai_cities[0]}, {country_name} -> {city_id} ({source})")
            # polite delay to avoid rate limiting
            time.sleep(0.1)
        else:
            if country_name and ai_cities:
                cache.setdefault(ck, {"city": ai_cities[0], "country": country_name})
            if args.verbose or idx % 50 == 0:
                print(f"[{idx}/{total}] {iata} -> {', '.join(ai_cities)} , {country_name} -> not found")

    # Write CSV back
    if not args.dry_run:
        with open(INPUT, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    # Save cache
    if not args.dry_run:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)

    if args.dry_run:
        print(f"✅ Would update {updated} rows (dry run). No files written.")
    else:
        print(f"✅ Updated {updated} rows with hotellook_city_id_airport. Wrote in-place to {INPUT}.")


if __name__ == "__main__":
    main()


