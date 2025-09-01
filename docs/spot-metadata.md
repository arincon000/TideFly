Spot metadata (MVP schema & rules)

Status: FROZEN (Phase 0) — changes require a PR and reviewer approval
Frozen date: 2025-09-01

Required fields

id (uuid) — primary key

name (text) — display & search

country (text, normalized) — pick ISO English names or ISO-3166-1 alpha-2 codes; use one convention only

region_major (enum) — one of: Europe | North America | Central America | South America | Caribbean | Africa | Asia-Pacific

latitude, longitude (float) — ≥ 4 decimals; ranges lat −90..90, lon −180..180

timezone (text, IANA) — e.g., Europe/Lisbon, Atlantic/Canary (must be a valid IANA zone)

primary_airport_iata (text) — uppercase 3-letter IATA (e.g., LIS, BIQ)

difficulty (text) — UI copy only (e.g., “All levels”, “Advanced/Expert”)

skill_level (enum) — beginner | intermediate | advanced (drives presets)

seasonality (text) — human readable (e.g., “Sep–Mar best, summer ok”)

created_at (timestamptz) — default now() on insert

Recommended fields (additive)

secondary_airports_iata (text[] or comma-separated text) — alternate airports (e.g., {FAO,OPO})

wave_min_m, wave_max_m, wind_max_kmh (numeric, nullable) — overrides for this spot (units: meters, km/h)

season_months (text) — normalized months, e.g., 9–3 (wrap allowed); use all-year if applicable

orientation (text) — e.g., WSW

notes (text) — hazards/locals/quirks for Explore later

slug (text, unique) — kebab-case (e.g., ericeira-ribeira-d-ilhas-pt)

active (bool, default true) — soft-hide without deleting

Preset mapping & overrides

Presets by skill_level:

beginner → wave 0.8–1.5 m, wind ≤25 km/h

intermediate → 1.2–2.5 m, ≤30 km/h

advanced → 2.0–4.0 m, ≤35 km/h

Override rule: if any of wave_min_m, wave_max_m, wind_max_kmh are set on the spot, the worker uses those instead of the preset.

Difficulty → skill_level mapping (fallback)

Use when only difficulty text exists:

“Beginner”, “Beginner/Intermediate” → beginner

“Intermediate”, “Intermediate/Advanced”, “All levels” → intermediate

“Advanced”, “Advanced/Expert”, big-wave → advanced

Validation checklist (for seeding)

 Country naming consistent with chosen convention

 Timezone is valid IANA

 Lat/Lon precision ≥ 4 decimals and within valid ranges

 primary_airport_iata is uppercase and 3 letters

 skill_level set (or deterministically mapped from difficulty)

 Overrides numeric/sensible (wave_min < wave_max; wind_max_kmh within 0–100)

 No unintended duplicates for the same peak (unless intentionally separate breaks)

 slug present and unique when used

 active true (unless intentionally hidden)

CSV header for seeding (also stored at data/spots.seed.header.csv):
id,name,country,region_major,latitude,longitude,timezone,primary_airport_iata,secondary_airports_iata,difficulty,skill_level,wave_min_m,wave_max_m,wind_max_kmh,seasonality,season_months,orientation,notes,slug,active,created_at
