#!/usr/bin/env python3
"""
Transform spots CSV for public hotel providers:
- Rename 'hotellook_city_name' -> 'iata_city_name'
- Ensure 'nearest' -> 'nearest_city'
- Drop Hotellook ID columns: 'hotellook_city_id', 'hotellook_city_id_airport', 'hotellook_city_id_near'
- Fill missing iata_city_name using primary_airport_iata via AI + overrides

Reads: --in (required) e.g., spots_upload_fixed.csv
Writes: --out (default: spots_with_cities_final.csv)
"""
import csv
import os
import sys
import argparse
import json
import re
from typing import Dict, Tuple, Optional
import requests

AIRPORTS_CSV = "airports_dataset.csv"

def ensure_airports_dataset() -> Dict[str, Tuple[str, str]]:
    """Download and index an airports dataset mapping code -> (city,country)."""
    mapping: Dict[str, Tuple[str, str]] = {}
    if not os.path.exists(AIRPORTS_CSV):
        for url in [
            "https://ourairports.com/data/airports.csv",
            "https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/airports.csv",
        ]:
            try:
                r = requests.get(url, timeout=60)
                r.raise_for_status()
                with open(AIRPORTS_CSV, "wb") as f:
                    f.write(r.body if hasattr(r, 'body') else r.content)
                break
            except Exception:
                continue
    try:
        with open(AIRPORTS_CSV, "r", encoding="utf-8") as f:
            import csv as _csv
            reader = _csv.DictReader(f)
            for row in reader:
                code_iata = (row.get("iata_code") or "").strip().upper()
                ident = (row.get("ident") or "").strip().upper()
                local = (row.get("local_code") or "").strip().upper()
                muni = (row.get("municipality") or row.get("city") or "").strip()
                country = (row.get("iso_country") or "").strip()
                if muni:
                    if code_iata:
                        mapping[code_iata] = (muni, country)
                    if ident and ident not in mapping:
                        mapping[ident] = (muni, country)
                    if local and local not in mapping:
                        mapping[local] = (muni, country)
    except Exception:
        pass
    return mapping

AIRPORT_MAP: Dict[str, Tuple[str, str]] = ensure_airports_dataset()

def resolve_city_from_iata_public(iata: str) -> Optional[Tuple[str, str]]:
    if not iata:
        return None
    if AIRPORT_MAP:
        hit = AIRPORT_MAP.get(iata.upper())
        if hit and hit[0]:
            return hit
    # Travelpayouts autocomplete (public)
    try:
        resp = requests.get(
            "https://autocomplete.travelpayouts.com/places2",
            params={"term": iata, "locale": "en", "types[]": ["airport", "city"]},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        iata_upper = iata.upper()
        airport = next((x for x in data if x.get("type") == "airport" and x.get("code") == iata_upper), None)
        if airport:
            city_name = airport.get("city_name") or airport.get("name")
            country_name = airport.get("country_name") or ""
            if city_name:
                return city_name, country_name
        city = next((x for x in data if x.get("type") == "city"), None)
        if city:
            return city.get("name"), city.get("country_name") or ""
    except Exception:
        pass
    return None

def require_input(path: str) -> str:
    if not os.path.exists(path):
        print(f"Error: input CSV not found: {path}")
        sys.exit(1)
    return path

OVERRIDES: Dict[str, Tuple[str, str]] = {
    "SDB": ("Langebaan", "South Africa"),
    "JFM": ("Fremantle", "Australia"),
    "PDM": ("Pedasí", "Panama"),
    "MYR": ("Myrtle Beach", "United States"),
    "PNS": ("Pensacola", "United States"),
    "NKX": ("San Diego", "United States"),
}

 

def ai_city_for_iata(iata: str, api_key: str, spot: str, country_hint: str) -> Optional[Tuple[str, str]]:
    if not api_key:
        return None
    try:
        prompt = (
            "Return JSON {\"city\":\"...\",\"country\":\"...\"} with the best municipality/primary city for this airport code.\n"
            f"IATA: {iata}\nSpot: {spot}\nCountry hint: {country_hint}\n"
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
        try:
            data = json.loads(txt)
        except Exception:
            m = re.search(r"\{.*\}", txt, flags=re.S)
            data = json.loads(m.group(0)) if m else None
        if not data:
            return None
        city = (data.get("city") or "").strip()
        country = (data.get("country") or "").strip()
        if city:
            return city, country
        return None
    except Exception:
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="input CSV, e.g., spots_upload_fixed.csv")
    ap.add_argument("--api-key", default=os.getenv("OPENAI_API_KEY", ""))
    ap.add_argument("--out", default="spots_with_cities_final.csv")
    ap.add_argument("--limit", type=int, default=0, help="process only first N rows and write only those rows")
    ap.add_argument("--public-only", action="store_true", help="only use public datasets/APIs; no AI calls")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    inp = require_input(args.inp)
    with open(inp, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    # Optional limit for sampling
    if args.limit and args.limit > 0:
        rows = rows[: args.limit]

    # Rename columns
    rename_map = {
        "hotellook_city_name": "iata_city_name",
        "nearest": "nearest_city",
    }
    for old, new in rename_map.items():
        if old in fieldnames and new not in fieldnames:
            fieldnames[fieldnames.index(old)] = new
        # If both exist, we prefer value from old when new is empty

    # Ensure required fields exist
    if "iata_city_name" not in fieldnames:
        fieldnames.append("iata_city_name")
    if "nearest_city" not in fieldnames:
        fieldnames.append("nearest_city")

    drop_cols = {"hotellook_city_id", "hotellook_city_id_airport", "hotellook_city_id_near"}

    updated = 0
    total = len(rows)
    for idx, r in enumerate(rows, 1):
        # Column renames at row level
        for old, new in rename_map.items():
            if old in r:
                if new not in r or not r.get(new):
                    r[new] = r.get(old) or ""
                r.pop(old, None)
        # Drop obsolete
        for c in list(drop_cols):
            r.pop(c, None)

        if not r.get("iata_city_name"):
            iata = (r.get("primary_airport_iata") or r.get("dest_iata") or "").strip().upper()
            if not iata:
                continue
            if iata in OVERRIDES:
                city, _country = OVERRIDES[iata]
                r["iata_city_name"] = city
                updated += 1
            else:
                pub = resolve_city_from_iata_public(iata)
                if pub:
                    city, _country = pub
                    r["iata_city_name"] = city
                    updated += 1
                elif not args.public_only:
                    guess = ai_city_for_iata(iata, args.api_key, r.get("full_location_name", ""), r.get("country_clean", ""))
                    if guess:
                        city, _country = guess
                        r["iata_city_name"] = city
                        updated += 1
        if args.verbose and (idx % 250 == 0 or idx == total):
            print(f"Progress: {idx}/{total} rows processed, {updated} iata_city_name filled")

    # Rebuild fieldnames after drops
    fieldnames = [fn for fn in fieldnames if fn not in drop_cols]

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    if args.verbose:
        print(f"Done. Wrote {args.out}. Filled iata_city_name for {updated} rows. Total rows written: {len(rows)}")

if __name__ == "__main__":
    main()


