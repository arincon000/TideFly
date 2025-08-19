# API Contracts (DB Views)

We expose a stable, versioned API from Postgres via schema-qualified **views**.  
The worker consumes these instead of raw tables so schema changes don’t break jobs.

## v1

- `api.v1_spots` → maps `public.spots.primary_airport_iata` → `nearest_airport_iata`
- `api.v1_alert_rules` → maps `public.alert_rules.destination_iata` → `dest_iata`
  and provides placeholders (`regions`, `expires_at`) to match the worker’s select.

**PostgREST paths:** `/rest/v1/api.v1_spots`, `/rest/v1/api.v1_alert_rules`

## Evolving the contract

- Don’t break `v1`. If internal tables change, **update the view definitions**.
- For breaking changes, create `api.v2_*`, migrate clients, then retire `v1`.

This lets frontend, worker(s), and BI tools rely on a stable shape over time.
