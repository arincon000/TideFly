# TideFly Tier Spec (Phase 2 — Lean)

**Status:** FROZEN (Phase 2) — changes require a PR and reviewer approval  
**Frozen date:** 2025-09-04

## Purpose
Freeze behavior for **Free** vs **Pro** so DB rules, UI gating, worker logic, and emails stay consistent at launch.  
Affiliates (Aviasales + Hotellook) are live; Booking.com can be enabled later via env.

---

## What changed vs Phase 0 (snapshot)
- **Limits:** Free **3 created / 1 active** (was 2 total); Pro **10/5** (unchanged).
- **Cadence:** both tiers **~1 run/day** via `cooldown_hours=24` (was “hourly allowed” for Pro).
- **Affiliates:** Flight CTA → **Aviasales**; Hotel CTA → **Hotellook** (Booking later), with TP marker + `sub_id`.
- **Explore/Suggestions:** remain teased/flagged; not GA for Phase 2.
- **Payments:** not in this doc; Stripe is Phase 3.

---

## 1) Tiers & Limits

### Free
- **Alerts:** **3 created**, **1 active**
- **Windows:** **0–5 days** (Confident) only
- **Config:** Presets by **skill** (spot defaults). No custom wave/wind. *(Optional `price_max_usd` may be stored but worker can ignore for Free when applying “reasonable flight”)*  
- **Cadence:** **~1 run/day** per rule (`cooldown_hours = 24`)

### Pro
- **Alerts:** **10 created**, **5 active**
- **Windows:** **0–5**, **6–10**, **11–16** days
- **Config:** **Full custom** filters (wave min/max, wind max, price cap) when exposed
- **Cadence:** **~1 run/day** (`cooldown_hours = 24`). *We may flip to 12h later via env.*

> Limits are env-tunable via `TIER_LIMITS`; cadence is per-alert via `cooldown_hours`.

---

## 2) Skill Tiers → Default Conditions
*(Units: meters wave, km/h wind)*

- **Beginner:** **0.8–1.5 m**, **≤25 km/h**  
- **Intermediate:** **1.2–2.5 m**, **≤30 km/h**  
- **Advanced:** **2.0–4.0 m**, **≤35 km/h**

Notes: each spot stores `skill_level`; worker prefers spot overrides if present.

---

## 3) Forecast Window Categories (inclusive)
- **Confident:** **0–5 days** (Free & Pro) — highest skill  
- **Swell Watch:** **6–10** (Pro) — medium confidence  
- **Long Watch (trend-only):** **11–16** (Pro) — trend guidance, conservative messaging

**Timezone/Daytime:** “Daytime” = **06:00–18:00** in the spot’s **IANA timezone**; all date math uses that timezone.

---

## 4) Spot Metadata (seed requirements)

**Required**
- `id (uuid)`, `name`, `country (normalized)`
- `region_major` (enum: Europe | North America | Central America | South America | Caribbean | Africa | Asia-Pacific)
- `latitude`, `longitude`, `timezone (IANA)`
- `primary_airport_iata`
- `difficulty (display text)`, `skill_level (beginner | intermediate | advanced)`
- `seasonality (human readable)`, `created_at (timestamptz)`

**Recommended (overrides / UX)**
- `secondary_airports_iata`, `wave_min_m`, `wave_max_m`, `wind_max_kmh`
- `season_months (e.g., 9–3)`, `orientation`, `notes`, `slug (unique)`, `active (bool)`

**Preset mapping (fallback)**
If only `difficulty` exists → map to `skill_level`:
- **Beginner / Beginner–Intermediate** → `beginner`
- **Intermediate / Intermediate–Advanced / All levels** → `intermediate`
- **Advanced / Advanced–Expert / big-wave** → `advanced`

**Normalization rules (must hold)**
- **Country:** one convention (ISO names **or** alpha-2 codes)
- **Timezone:** valid IANA (`Europe/Lisbon`, `Atlantic/Canary`)
- **Duplicates:** resolve near-duplicates unless truly distinct peaks
- **Coords:** ≥ **4** decimal places
- **Airports:** primary required; add secondary when useful

---

## 5) Forecast Match Rule (worker)
A date qualifies if **all** true:
1) Wave height **∈ [min, max]**  
2) **Wind ≤ max_wind**  
3) Conditions hold **≥4 daytime hours** (06:00–18:00 local)

**Window selection**
- **Free:** category **0–5** only  
- **Pro:** exact day selection **≤16** allowed

---

## 6) Flight Selection Rule
- **Free:** ignore strict budget; search primary (+ secondary if any); return **cheapest** or **≤ 1.5× median** for that week/query. If prices are all high, return cheapest + `price_flag: high`.
- **Pro:** **respect price cap** (`price_max_usd`) strictly; primary + secondary considered.

---

## 7) Event Notes (stamp on each alert event)
`tier: free|pro` • `matched: beginner-preset|intermediate-preset|advanced-preset|custom` •  
`window_category: confident|swell|long` *(or `exact_days: N` for Pro)* •  
`ignored_price_for_free: true|false` • `price_flag: high|ok` • *(optional)* `airports_considered: ["LIS","FAO"]`

---

## 8) UI Gating (Free vs Pro)

### Free wizard flow
**Skill → Spot → Window → Travel → Review**

- **Skill chips:** Beginner / Intermediate / Advanced
- **Spot list:** filtered by chosen skill; warn if mismatch and use the spot’s `skill_level`
- **Window:** **Confident 0–5** enabled; **6–10 / 11–16** disabled with “Pro” lock
- **Travel:** Origin **IATA**, Dates (Return optional but required for hotel CTA), Nights; **no** custom wave/wind
- **Banner:** “**Active A/X • Created C/Y**”; **Primary CTA:** Create; **Secondary:** Upgrade

### Pro
- Show all fields; confidence labels **0–5 High**, **6–10 Medium**, **11–16 Trend**

---

## 9) Cadence Model
- Worker schedule unchanged; cadence is **per alert** via `alert_rules.cooldown_hours`
- **Phase 2 defaults:** `FREE_COOLDOWN_HOURS=24`, `PRO_COOLDOWN_HOURS=24`  
  *(We may flip Pro to 12h later via env without code.)*
- **Worker runs hourly via GitHub Actions. Each alert enforces cooldown_hours=24, so each rule executes at most once per 24h.**

---

## 10) Affiliates (MVP)
- **Flights:** Aviasales deeplink (Amadeus detects → Aviasales monetizes)
- **Hotels:** **Hotellook** (default); **Booking.com** later by env flip
- Tracking: Travelpayouts **marker** + `sub_id=alert_<uuid>`
- Disclosure: “Links may contain affiliate codes.”

**Env flags**
ENABLE_AFFILIATES=true|false
AVIA_AFFILIATE_ID=<marker>
ENABLE_HOTEL_CTA=true|false
HOTEL_PROVIDER=hotellook|booking
TP_P_HOTELLOOK=4115
TP_P_BOOKING=<numeric id when approved>


---

## 11) Acceptance Criteria
- Forecast bands fixed at **0–5 / 6–10 / 11–16**; **max lead time 16 days**
- Daytime & threshold pinned (**06:00–18:00**, **≥4 hours**)
- **Free** “reasonable flight” rule applied; **Pro** honors price cap
- Limits enforced; **banner** shows **Active A/X • Created C/Y**; paused/snoozed count toward **Created** only
- Cadence respected via `cooldown_hours`
- Emails deliver with Flight CTA (Aviasales or fallback) and optional Hotel CTA (Hotellook/Booking) for RT

