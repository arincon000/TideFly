TideFly Tier Spec (Phase 0)
Status: FROZEN (Phase 0) — changes require a PR and reviewer approval Frozen date: 2025-09-01

Purpose. Freeze behavior for Free vs Pro so DB rules, UI gating, and worker logic are consistent at launch (Explore = sneak peek only).

1) Tiers & Limits

Free

Alerts: 2

Config: No custom wave/wind/price. Must select Skill level (from spot) + Window category.

Flights: Ignore budget; pick reasonable option (cheapest or ≤ 1.5× median fare for query/week).

Cadence: Daily max per rule (deduped).

Pro

Alerts: 10

Config: Full custom (wave min/max, wind max, exact window days, price cap).

Flights: Respect price cap strictly.

Cadence: Hourly allowed (dedupe applies).

2) Skill Tiers → Default Conditions

Units: meters (wave), km/h (wind)

Beginner: 0.8–1.5 m, ≤25 km/h

Intermediate: 1.2–2.5 m, ≤30 km/h

Advanced: 2.0–4.0 m, ≤35 km/h
Notes: each spot stores `skill_level`; worker prefers spot overrides if present.

3) Forecast Window Categories (inclusive)

Confident: 0–5 days (Free & Pro) — highest skill

Swell Watch: 6–10 (Pro) — medium confidence

Long Watch (trend-only): 11–16 (Pro) — trend guidance, conservative messaging
Timezone/Daytime: “Daytime” = 06:00–18:00 in the spot’s IANA timezone; all date math uses that timezone.


4) Spot Metadata (seed requirements)

Required

id (uuid), name, country (normalized),

region_major (enum: Europe | North America | Central America | South America | Caribbean | Africa | Asia-Pacific),

latitude, longitude, timezone (IANA),

primary_airport_iata,

difficulty (display text), skill_level (beginner | intermediate | advanced),

seasonality (human readable), created_at (timestamptz)

Recommended (overrides / UX)

secondary_airports_iata, wave_min_m, wave_max_m, wind_max_kmh,

season_months (e.g., 9–3), orientation, notes, slug (unique), active (bool)

Preset mapping (fallback)

If only difficulty exists → map to skill_level:

Beginner / Beginner–Intermediate → beginner

Intermediate / Intermediate–Advanced / All levels → intermediate

Advanced / Advanced–Expert / big-wave → advanced

Normalization rules (must hold)

Country: one convention only (ISO names or alpha-2 codes).

Timezone: valid IANA (e.g., Europe/Lisbon, Atlantic/Canary).

Duplicates: resolve near-duplicates unless truly distinct peaks.

Coords: ≥ 4 decimal places.

Airports: primary required; add secondary when useful.

5) Forecast Match Rule (worker)

A date qualifies if all true:

Wave height ∈ [min, max]

Wind ≤ max_wind

Conditions hold ≥4 daytime hours (06:00–18:00 local)

Window selection:

Free: category 0–5 only

Pro: exact forecast_days ≤16

6) Flight Selection Rule

Free: ignore budget; search origin → primary (and secondary if any); return cheapest or ≤1.5× median. If prices all high, return cheapest + price_flag: high.

Pro: strictly ≤ price cap (primary + secondary considered).

7) Event Notes (stamp on each alert event)

tier: free|pro • matched: beginner-preset|intermediate-preset|advanced-preset|custom •
window_category: confident|swell|long (or exact_days: N) •
ignored_price_for_free: true|false • price_flag: high|ok • (optional) airports_considered: ["LIS","FAO"]

8) UI Gating (Free vs Pro)

Free wizard flow: Skill → Spot → Window → Travel → Review

Skill chips (Beginner / Intermediate / Advanced)

Spot list filtered by chosen skill; if mismatch, warn and use the spot’s own skill_level

Window: Confident 0–5 enabled; 6–10/11–16 disabled with Pro lock

Travel: Origin IATA, Nights min/max; no wave/wind/price fields

Banner: “X/2 alerts used”; CTA: Create alert; secondary: Upgrade

Pro: show all fields; confidence labels 0–5 High, 6–10 Medium, 11–16 Trend

9) Non-Goals (Phase 0)

Payments/Stripe, full Explore map, “Surprise me” logic (Explore = teaser only).

10) Acceptance Criteria (sign-off)

Forecast bands fixed at 0–5 / 6–10 / 11–16; max lead time 16 days.

Daytime & threshold pinned (06:00–18:00, ≥4 hours).

“Reasonable flight” = cheapest or ≤1.5× median.

Spot metadata: required fields present for ≥90 seeded spots; IANA timezones valid; consistent country naming; deduped; coordinate precision OK; skill_level set (or mapped).

Free/Pro behaviors above are the contract for Phases 1–3.

Worker stamps event notes on each alert: tier, matched (preset/custom), window_category|exact_days, ignored_price_for_free, price_flag, (optional) airports_considered.
