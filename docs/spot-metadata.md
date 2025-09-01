---

# Spot metadata (MVP schema & rules)

**Status:** FROZEN (Phase 0) — changes require a PR and reviewer approval
**Frozen date:** 2025-09-01

## Purpose

Define the minimal, normalized spot schema TideFly needs at launch so **Free** and **Pro** logic, worker forecasts, and flight searches behave consistently.

---

## 1) Required fields

* **id** *(uuid)* — primary key
* **name** *(text)* — display & search
* **country** *(text, normalized)* — pick **ISO English names** *or* **ISO-3166-1 alpha-2 codes**; use one convention only
* **region\_major** *(enum)* — one of: **Europe | North America | Central America | South America | Caribbean | Africa | Asia-Pacific**
* **latitude**, **longitude** *(float)* — ≥ **4** decimals; valid ranges **lat −90..90**, **lon −180..180**
* **timezone** *(text, IANA)* — e.g., `Europe/Lisbon`, `Atlantic/Canary` (must be a valid IANA zone)
* **primary\_airport\_iata** *(text)* — **uppercase 3-letter IATA** (e.g., `LIS`, `BIQ`)
* **difficulty** *(text)* — UI copy (e.g., “All levels”, “Advanced/Expert”)
* **skill\_level** *(enum)* — `beginner | intermediate | advanced` (drives presets)
* **seasonality** *(text)* — human-readable (e.g., “Sep–Mar best, summer ok”)
* **created\_at** *(timestamptz)* — default **now()** on insert

---

## 2) Recommended fields (additive)

* **secondary\_airports\_iata** *(text\[] or comma-separated text)* — alternates (e.g., `{FAO,OPO}`)
* **wave\_min\_m**, **wave\_max\_m**, **wind\_max\_kmh** *(numeric, nullable)* — **overrides** for this spot (units: meters, km/h)
* **season\_months** *(text)* — normalized months, e.g., `9–3` (wrap allowed); use `all-year` if applicable
* **orientation** *(text)* — e.g., `WSW`
* **notes** *(text)* — hazards/quirks for Explore later
* **slug** *(text, unique)* — kebab-case (e.g., `ericeira-ribeira-d-ilhas-pt`)
* **active** *(bool, default true)* — soft-hide without deleting

---

## 3) Preset mapping & overrides

**Units:** wave in **meters**, wind in **km/h**.

**Presets by `skill_level`:**

* **beginner** → wave **0.8–1.5 m**, wind **≤25 km/h**
* **intermediate** → **1.2–2.5 m**, **≤30 km/h**
* **advanced** → **2.0–4.0 m**, **≤35 km/h**

**Override rule:** if any of `wave_min_m`, `wave_max_m`, or `wind_max_kmh` are set on the spot, the worker **uses those instead of the preset**.

---

## 4) Difficulty → skill\_level mapping (fallback)

Use when only `difficulty` text exists:

* “Beginner”, “Beginner/Intermediate” → **beginner**
* “Intermediate”, “Intermediate/Advanced”, “All levels” → **intermediate**
* “Advanced”, “Advanced/Expert”, big-wave → **advanced**

---

## 5) Normalization rules (must hold for seed)

* **Country** naming: one convention only (ISO names **or** alpha-2 codes).
* **Timezone**: valid IANA identifiers (no raw UTC offsets).
* **Duplicates**: resolve near-duplicate rows unless they are truly distinct peaks.
* **Coordinates**: precision ≥ 4 decimals; values within valid ranges.
* **Airports**: **primary\_airport\_iata** required; add **secondary\_airports\_iata** where helpful.
* **skill\_level**: explicitly set, or deterministically mapped from `difficulty`.

---

## 6) Validation checklist (for seeding)

* [ ] Country naming consistent with chosen convention
* [ ] Timezone is valid IANA
* [ ] Lat/Lon precision ≥ 4 decimals and within valid ranges
* [ ] `primary_airport_iata` uppercase and 3 letters
* [ ] `skill_level` set (or mapped from difficulty)
* [ ] Overrides numeric/sensible (wave\_min < wave\_max; wind\_max\_kmh 0–100)
* [ ] No unintended duplicates for the same peak
* [ ] `slug` present and unique when used
* [ ] `active` true (unless intentionally hidden)

---

## 7) CSV header for seeding

Store this header in `data/spots.seed.header.csv` (already created in Phase 0):

```
id,name,country,region_major,latitude,longitude,timezone,primary_airport_iata,secondary_airports_iata,difficulty,skill_level,wave_min_m,wave_max_m,wind_max_kmh,seasonality,season_months,orientation,notes,slug,active,created_at
```

---
