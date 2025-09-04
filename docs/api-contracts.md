# API Contracts (DB Views) — v1 (Stable)

We expose a stable, versioned API via schema-qualified **views**.  
UI and worker consume these views; internal table changes must be absorbed by view updates.

---

## Current Live Views

### v1 (Stable)
- `api.v1_spots` — maps `public.spots` (keeps nearest airport)
- `api.v1_alert_rules` — maps `public.alert_rules` (includes cadence/status fields)
- `api.v1_rule_status` — computed cadence/eligibility per rule

### Tier Management
- `api.v_tier_me` — returns `plan_tier`, `plan_expires_at` (RLS protected)

### Forecast Categories
- `public.forecast_window_categories` — definitions with sort order

**PostgREST paths:**  
`/rest/v1/api.v1_spots`, `/rest/v1/api.v1_alert_rules`, `/rest/v1/api.v1_rule_status`

---

## View Shapes (required fields)

### `api.v1_spots`
Must include:
- `id, name, country, region_major, latitude, longitude, timezone`
- `primary_airport_iata AS nearest_airport_iata`
- `skill_level, wave_min_m, wave_max_m, wind_max_kmh`
- `seasonality, season_months, created_at`

### `api.v1_alert_rules`
Map to:
- `id, user_id`
- `origin_iata`
- `dest_iata` *(map legacy `destination_iata` → `dest_iata`)*
- `depart_date, return_date`
- `price_max_usd`
- `is_active, paused_until`
- `cooldown_hours`
- `last_checked_at, last_notified_at`
- `created_at, updated_at`
- *(optionally keep placeholders once used)* `regions, expires_at`

> If the physical table is missing any required column, add it to **public.alert_rules** first; don’t fake it in the view.

### `api.v1_rule_status`
Provides:
- `alert_id`
- `is_paused` (bool)
- `next_eligible_at` = `GREATEST(COALESCE(paused_until,'-inf'), COALESCE(last_checked_at,'-inf') + (cooldown_hours || ' hours')::interval)`
- `is_eligible_now` = `is_active AND now() >= next_eligible_at`

---

## Suggested SQL (safe updates)

```sql
-- v1_alert_rules (cadence + status fields explicit)
create or replace view api.v1_alert_rules as
select
  ar.id,
  ar.user_id,
  ar.origin_iata,
  coalesce(ar.dest_iata, ar.destination_iata) as dest_iata,
  ar.depart_date,
  ar.return_date,
  ar.price_max_usd,
  ar.is_active,
  ar.paused_until,
  coalesce(ar.cooldown_hours, 24) as cooldown_hours,
  ar.last_checked_at,
  ar.last_notified_at,
  ar.created_at,
  ar.updated_at
from public.alert_rules ar;

-- v1_rule_status (eligibility math)
create or replace view api.v1_rule_status as
select
  ar.id as alert_id,
  not ar.is_active or (ar.paused_until is not null and ar.paused_until > now()) as is_paused,
  greatest(
    coalesce(ar.paused_until, '-infinity'::timestamptz),
    coalesce(ar.last_checked_at, '-infinity'::timestamptz) + (coalesce(ar.cooldown_hours,24)::text || ' hours')::interval
  ) as next_eligible_at,
  (ar.is_active and now() >= greatest(
    coalesce(ar.paused_until, '-infinity'::timestamptz),
    coalesce(ar.last_checked_at, '-infinity'::timestamptz) + (coalesce(ar.cooldown_hours,24)::text || ' hours')::interval
  )) as is_eligible_now
from public.alert_rules ar;
