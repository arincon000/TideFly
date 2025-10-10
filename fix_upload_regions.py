#!/usr/bin/env python3
"""
Fix and normalize regions/countries in spots_upload.csv before staging import.

Inputs (expected headers):
  full_location_name,country_clean,latitude,longitude,timezone,
  primary_airport_iata,region_major,slug,active,nearest,hotellook_city_id,
  skill_level_min,skill_level_max

Outputs:
  - spots_upload_fixed.csv  (corrected country_clean + region_major; name tweaks)
  - region_fix_report.txt   (what changed + flags that still need review)

Optional: pass --ai to use OpenAI (OPENAI_API_KEY env) for unknown region inference.
"""
import csv
import os
import sys
import json
import time
import argparse
from typing import Dict, List


ENUM_REGIONS = [
    "Africa",
    "Asia",
    "Middle East",
    "Caribbean",
    "Europe",
    "North America",
    "South America",
    "Central America",
    "Oceania",
]

# Regional sets (extendable)
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
    "Syria","Taiwan","Tajikistan","Thailand","Timor-Leste","Turkey","Turkiye","Turkmenistan",
    "United Arab Emirates","Uzbekistan","Vietnam","Yemen",
}

AFRICA = {
    "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon",
    "Central African Republic","Chad","Comoros","Congo","Congo (Democratic Republic)","Cote d'Ivoire",
    "Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana",
    "Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali",
    "Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda",
    "Sao Tome and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan",
    "Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe","Reunion",
}

NORTH_AMERICA = {"United States","USA","Canada","Greenland","Bermuda","Mexico"}
CENTRAL_AMERICA = {"Belize","Costa Rica","El Salvador","Guatemala","Honduras","Nicaragua","Panama"}
SOUTH_AMERICA = {"Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Guyana","Paraguay","Peru","Suriname","Uruguay","Venezuela"}
OCEANIA = {"Australia","New Zealand","Fiji","Samoa","Samoa Western","American Samoa","Tonga","Vanuatu","Solomon Islands","Papua New Guinea","New Caledonia","French Polynesia","Tahiti","Cook Islands","Micronesia","Northern Mariana Islands","Guam"}

# Middle East grouping (policy decision for UI regionalization)
MIDDLE_EAST = {
    "Bahrain","Iran","Iraq","Israel","Jordan","Kuwait","Lebanon","Oman","Palestine","Qatar",
    "Saudi Arabia","Syria","Turkey","Turkiye","United Arab Emirates","UAE","Yemen",
}

# Caribbean and Atlantic island territories often used in surf datasets
CARIBBEAN = {
    "Antigua and Barbuda","Aruba","Bahamas","Barbados","Bonaire","British Virgin Islands","Cayman Islands",
    "Cuba","Curacao","Curaçao","Dominica","Dominican Republic","Grenada","Guadeloupe","Haiti","Jamaica",
    "Martinique","Montserrat","Puerto Rico","Saint Barthelemy","Saint Barthélemy","Saint Kitts and Nevis",
    "Saint Lucia","Saint Martin","Sint Maarten","Saint Vincent and the Grenadines","Trinidad and Tobago",
    "Turks and Caicos","US Virgin Islands","Virgin Islands U.S.","Virgin Islands British",
}


def infer_region(country: str) -> str:
    c = (country or "").strip()
    if not c:
        return ""
    if c in MIDDLE_EAST: return "Middle East"
    if c in CARIBBEAN: return "Caribbean"
    if c in EUROPE: return "Europe"
    if c in ASIA: return "Asia"
    if c in AFRICA: return "Africa"
    if c in NORTH_AMERICA: return "North America"
    if c in CENTRAL_AMERICA: return "Central America"
    if c in SOUTH_AMERICA: return "South America"
    if c in OCEANIA: return "Oceania"
    lc = c.lower()
    # Canary Islands handling (country strings that clearly indicate Canary)
    if "canary" in lc or "canarias" in lc:
        return "Europe"  # administratively Spain, shown under Europe
    return ""


def normalize_country_and_name(country: str, name: str) -> (str, str):
    c = (country or "").strip()
    lc = c.lower()
    # Common aliases/abbreviations
    if c in ("UAE","U.A.E."):
        return "United Arab Emirates", name
    if c in ("KSA","Saudi"):
        return "Saudi Arabia", name
    if c == "Turkiye":
        return "Turkey", name
    if lc.startswith("madeira"):
        if "madeira" not in name.lower():
            name = f"{name}, Madeira"
        return "Portugal", name
    if lc.startswith("azores") or lc.startswith("açores"):
        if "azores" not in name.lower() and "açores" not in name.lower():
            name = f"{name}, Azores"
        return "Portugal", name
    if "canary" in lc or "canarias" in lc:
        # Treat country as Spain, keep spot name as-is
        return "Spain", name
    # Normalize Curaçao with cedilla -> Curacao
    if c in ("Curaçao",):
        return "Curacao", name
    # French overseas territories to canonical forms
    if c in ("Reunion", "Réunion"):
        return "Reunion", name
    if c in ("Saint Barthelemy","Saint Barthélemy"):
        return "Saint Barthelemy", name
    if c in ("Sint Maarten","Saint Martin"):
        # Keep as Sint Maarten (country-level) to avoid confusion with French Saint Martin (collectivity)
        return "Sint Maarten", name
    return c, name


def maybe_ai_region(country: str, key: str) -> str:
    """Optional OpenAI mapping for unknowns (only used if --ai and key set)."""
    if not key:
        return ""
    try:
        import requests
        prompt = (
            "Return ONLY one of these labels for the given country: "
            + ", ".join(ENUM_REGIONS)
            + f". Country: {country}."
        )
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
            },
            timeout=30,
        )
        r.raise_for_status()
        txt = r.json()["choices"][0]["message"]["content"].strip()
        return txt if txt in ENUM_REGIONS else ""
    except Exception:
        return ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ai", action="store_true", help="use OpenAI to classify unknown regions")
    parser.add_argument("--api-key", dest="api_key", default=os.getenv("OPENAI_API_KEY", ""))
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--prefer-middle-east", action="store_true", help="force Middle East for matching countries")
    parser.add_argument("--prefer-caribbean", action="store_true", help="force Caribbean for matching countries")
    args = parser.parse_args()

    use_ai = args.ai
    src = "spots_upload.csv"
    dst = "spots_upload_fixed.csv"
    report = "region_fix_report.txt"
    cache_path = "ai_region_cache.json"

    # AI cache: map country -> region label
    ai_cache: Dict[str, str] = {}
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as cf:
                ai_cache = json.load(cf)
        except Exception:
            ai_cache = {}

    with open(src, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    fixed_rows: List[Dict] = []
    changed = 0
    flagged = []

    # Precount potential AI targets for progress reporting
    ai_targets = 0
    for r in rows:
        country = r.get("country_clean", "")
        region = (r.get("region_major", "") or "").strip()
        new_country, _ = normalize_country_and_name(country, r.get("full_location_name", ""))
        inferred = infer_region(new_country)
        if (not region or region == "Other") and not inferred:
            ai_targets += 1

    ai_done = 0

    for r in rows:
        name = r.get("full_location_name", "")
        country = r.get("country_clean", "")
        region = (r.get("region_major", "") or "").strip()

        # Country/name normalization
        new_country, new_name = normalize_country_and_name(country, name)

        # Region inference (prefer Middle East / Caribbean mapping when requested)
        inferred = infer_region(new_country)
        if args.prefer_middle_east and new_country in MIDDLE_EAST:
            inferred = "Middle East"
        if args.prefer_caribbean and new_country in CARIBBEAN:
            inferred = "Caribbean"
        if not inferred and use_ai:
            cache_key = new_country.strip()
            cached = ai_cache.get(cache_key)
            if cached:
                inferred = cached
            else:
                inferred = maybe_ai_region(new_country, args.api_key)
                if inferred:
                    ai_cache[cache_key] = inferred
                ai_done += 1
                if args.verbose:
                    print(f"[AI] {ai_done}/{ai_targets} {new_country} -> {inferred or 'UNKNOWN'}", flush=True)

        new_region = region
        # Force overrides even if previously set differently
        if args.prefer_middle_east and new_country in MIDDLE_EAST and new_region != "Middle East":
            if args.verbose and new_region:
                print(f"[Override] {new_country}: {new_region} -> Middle East", flush=True)
            new_region = "Middle East"
        if args.prefer_caribbean and new_country in CARIBBEAN and new_region != "Caribbean":
            if args.verbose and new_region:
                print(f"[Override] {new_country}: {new_region} -> Caribbean", flush=True)
            new_region = "Caribbean"

        if not region or region == "Other":
            if inferred:
                new_region = inferred
            else:
                flagged.append({"slug": r.get("slug",""), "country": new_country, "note": "unknown-region"})

        # Save row
        out = dict(r)
        out["full_location_name"] = new_name
        out["country_clean"] = new_country
        out["region_major"] = new_region

        if new_country != country or new_name != name or new_region != region:
            changed += 1
        fixed_rows.append(out)

    # Write fixed CSV
    with open(dst, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fixed_rows[0].keys())
        writer.writeheader()
        writer.writerows(fixed_rows)

    # Persist AI cache
    if ai_cache:
        try:
            with open(cache_path, "w", encoding="utf-8") as cf:
                json.dump(ai_cache, cf, ensure_ascii=False, indent=2)
        except Exception:
            pass

    # Report
    with open(report, "w", encoding="utf-8") as f:
        f.write(f"Changed rows: {changed} of {len(rows)}\n")
        if flagged:
            f.write("\nFlagged (unknown region) examples:\n")
            for x in flagged[:50]:
                f.write(json.dumps(x, ensure_ascii=False) + "\n")

    print(f"✅ Wrote {dst}. Changed: {changed}. Flags: {len(flagged)}. See {report}.")


if __name__ == "__main__":
    main()


