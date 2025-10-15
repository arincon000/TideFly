#!/usr/bin/env python3
"""
Normalize regions and fix country anomalies in Supabase `spots`.

What it does:
  - Replaces region_major = 'Other' (or NULL) with a deterministic region based on country
  - Fixes Madeira/Azores -> country = 'Portugal' and appends the archipelago to spot name

Usage:
  # Dry run
  python normalize_regions.py

  # Commit changes (requires service role key)
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python normalize_regions.py --commit
"""
import os
import sys
import time
import json
import requests
from typing import Dict, List, Tuple


REGIONS = [
    "Africa",
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Central America",
    "Oceania",
]

# Region sets (not exhaustive but covers the vast majority; add more as needed)
EUROPE = {
    "Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria","Croatia",
    "Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Germany","Gibraltar","Greece",
    "Hungary","Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg",
    "Malta","Moldova","Monaco","Montenegro","Netherlands","North Macedonia","Norway","Poland","Portugal",
    "Romania","San Marino","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","United Kingdom",
    "UK","England","Scotland","Wales","Northern Ireland","Faroe Islands","Isle of Man","Jersey","Guernsey",
}

ASIA = {
    "Afghanistan","Armenia","Azerbaijan","Bahrain","Bangladesh","Bhutan","Brunei","Cambodia","China",
    "Georgia","India","Indonesia","Iran","Iraq","Israel","Japan","Jordan","Kazakhstan","Kuwait",
    "Kyrgyzstan","Laos","Lebanon","Malaysia","Maldives","Mongolia","Myanmar","Nepal","North Korea",
    "Oman","Pakistan","Palestine","Philippines","Qatar","Saudi Arabia","Singapore","South Korea","Sri Lanka",
    "Syria","Taiwan","Tajikistan","Thailand","Timor-Leste","Turkey","Turkiye","Turkmenistan","United Arab Emirates",
    "Uzbekistan","Vietnam","Yemen","Reunion","Sri Lanka",
}

AFRICA = {
    "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic",
    "Chad","Comoros","Congo","Congo (Democratic Republic)","Cote d'Ivoire","Djibouti","Egypt","Equatorial Guinea",
    "Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho",
    "Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia",
    "Niger","Nigeria","Rwanda","Sao Tome and Principe","Senegal","Seychelles","Sierra Leone","Somalia",
    "South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
}

NORTH_AMERICA = {"United States","USA","Canada","Greenland","Bermuda"}
CENTRAL_AMERICA = {"Belize","Costa Rica","El Salvador","Guatemala","Honduras","Nicaragua","Panama"}
SOUTH_AMERICA = {"Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Guyana","Paraguay","Peru","Suriname","Uruguay","Venezuela"}
OCEANIA = {"Australia","New Zealand","Fiji","Samoa","Samoa Western","American Samoa","Tonga","Vanuatu","Solomon Islands","Papua New Guinea","New Caledonia","French Polynesia","Tahiti","Cook Islands","Micronesia","Northern Mariana Islands","Guam"}


def infer_region(country: str) -> str:
    c = (country or "").strip()
    if not c:
        return ""
    if c in EUROPE: return "Europe"
    if c in ASIA: return "Asia"
    if c in AFRICA: return "Africa"
    if c in NORTH_AMERICA: return "North America"
    if c in CENTRAL_AMERICA: return "Central America"
    if c in SOUTH_AMERICA: return "South America"
    if c in OCEANIA: return "Oceania"
    # Heuristics for common variants
    lc = c.lower()
    if "canary" in lc: return "Europe"      # Canary Islands (Spain)
    if "madeira" in lc: return "Europe"      # Madeira (Portugal)
    if "azores" in lc: return "Europe"       # Azores (Portugal)
    if "reunion" in lc: return "Africa"      # Réunion (Africa region context)
    return ""  # unknown


def main():
    commit = "--commit" in sys.argv
    base_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url:
        print("Set SUPABASE_URL env var.")
        sys.exit(1)
    if commit and not key:
        print("Set SUPABASE_SERVICE_ROLE_KEY to write changes, or omit --commit for dry-run.")
        sys.exit(1)

    headers = {"apikey": key or "anon", "Authorization": f"Bearer {key}"} if key else {"apikey": "anon"}

    # Pull candidates needing fixes
    url = f"{base_url}/rest/v1/spots?select=id,name,country,region_major&or=(region_major.is.null,region_major.eq.Other)"
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    rows = r.json()
    print(f"Loaded {len(rows)} spots needing region normalization")

    updates: List[Dict] = []
    fixes_madeira = 0
    fixes_azores = 0

    for row in rows:
        sid = row["id"]
        name = row.get("name", "")
        country = (row.get("country") or "").strip()

        # Madeira/Azores normalization
        lc = country.lower()
        if lc.startswith("madeira"):
            country = "Portugal"
            if "madeira" not in name.lower():
                name = f"{name}, Madeira"
            fixes_madeira += 1
        elif lc.startswith("azores") or lc.startswith("açores"):
            country = "Portugal"
            if "azores" not in name.lower() and "açores" not in name.lower():
                name = f"{name}, Azores"
            fixes_azores += 1

        region = infer_region(country)
        if not region:
            continue

        updates.append({
            "id": sid,
            "name": name,
            "country": country,
            "region_major": region,
        })

    print(f"Proposed updates: {len(updates)} | Madeira fixes: {fixes_madeira} | Azores fixes: {fixes_azores}")

    if not commit:
        # Show a small sample
        for u in updates[:10]:
            print(" ->", u)
        print("Dry run complete. Add --commit to write.")
        return

    # Batch updates (upsert by id)
    upsert_url = f"{base_url}/rest/v1/spots?on_conflict=id"
    headers.update({"Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"})
    batch = 200
    total = 0
    for i in range(0, len(updates), batch):
        chunk = updates[i:i+batch]
        rr = requests.post(upsert_url, headers=headers, data=json.dumps(chunk))
        if rr.status_code not in (200, 201, 204):
            print("Write error:", rr.status_code, rr.text)
            sys.exit(1)
        total += len(chunk)
        time.sleep(0.2)
    print(f"✅ Wrote {total} rows.")


if __name__ == "__main__":
    main()




