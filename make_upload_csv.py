#!/usr/bin/env python3
import csv

SRC = "spots_with_cities_final.csv"
DST = "spots_upload.csv"

# Target headers expected by stage_spots_upload
TARGET_FIELDS = [
    "full_location_name",
    "country_clean",
    "latitude",
    "longitude",
    "timezone",
    "primary_airport_iata",
    "region_major",
    "slug",
    "active",
    "nearest",
    "hotellook_city_id",
    "skill_level_min",
    "skill_level_max",
]

def main():
    with open(SRC, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    out_rows = []
    for r in rows:
        out = {k: "" for k in TARGET_FIELDS}
        out["full_location_name"]   = r.get("full_location_name", "")
        out["country_clean"]        = r.get("country_clean", "")
        out["latitude"]             = r.get("latitude", "")
        out["longitude"]            = r.get("longitude", "")
        out["timezone"]             = r.get("timezone", "")
        out["primary_airport_iata"] = r.get("primary_airport_iata", "")
        out["region_major"]         = r.get("region_major", "")
        out["slug"]                 = r.get("slug", "")
        out["active"]               = r.get("active", "")
        # Map nearest_city -> nearest
        out["nearest"]              = r.get("nearest_city", r.get("nearest", ""))
        out["hotellook_city_id"]    = r.get("hotellook_city_id", "")
        out["skill_level_min"]      = r.get("skill_level_min", "")
        out["skill_level_max"]      = r.get("skill_level_max", "")
        out_rows.append(out)

    with open(DST, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=TARGET_FIELDS)
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"✅ Wrote {len(out_rows)} rows to {DST}")

if __name__ == "__main__":
    main()



