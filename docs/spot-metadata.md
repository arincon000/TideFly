Spot metadata (MVP schema & rules)

Required fields

id (uuid) — primary key

name — display & search

country — normalized (pick ISO English names or alpha-2, not both)

region_major — enum: Europe | North America | Central America | South America | Caribbean | Africa | Asia-Pacific

latitude, longitude — floats (≥ 4 decimals)

timezone — IANA (e.g., Europe/Lisbon, Atlantic/Canary)

primary_airport_iata — e.g., LIS, BIQ

difficulty — free-text for UI (“All levels”, “Advanced/Expert”, …)

skill_level — enum: beginner | intermediate | advanced (used for presets)

seasonality — human readable (e.g., “Sep–Mar best, summer ok”)

created_at — timestamptz

Recommended fields

secondary_airports_iata — array/text

wave_min_m, wave_max_m, wind_max_kmh — overrides (nullable)

season_months — normalized months, e.g., 9–3

orientation — text (e.g., WSW)

notes — text

slug — unique, for pretty URLs

active — bool (default true)

Preset mapping & overrides

Presets by skill_level:

beginner → 0.8–1.5 m, ≤25 km/h

intermediate → 1.2–2.5 m, ≤30 km/h

advanced → 2.0–4.0 m, ≤35 km/h

If any override is set on the spot, worker uses the override.

Difficulty → skill_level mapping (fallback)

“Beginner”, “Beginner/Intermediate” → beginner

“Intermediate”, “Intermediate/Advanced”, “All levels” → intermediate

“Advanced”, “Advanced/Expert”, big-wave → advanced

Validation checklist (for seeding)

 Country naming consistent

 Timezone is valid IANA

 No duplicate rows for same peak (unless intentional)

 Lat/Lon precision ≥ 4 decimals

 primary_airport_iata present

 skill_level set (or mapped)

 Overrides (if any) are numeric and sensible
