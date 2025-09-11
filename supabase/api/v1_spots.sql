create schema if not exists api;

create or replace view api.v1_spots as
SELECT id,
    name,
    country,
    latitude,
    longitude,
    timezone,
    seasonality,
    difficulty,
    created_at,
    primary_airport_iata,
    region_major,
    skill_level,
    secondary_airports_iata,
    wave_min_m,
    wave_max_m,
    wind_max_kmh,
    season_months,
    orientation,
    notes,
    slug,
    active
   FROM spots;

-- ensure correct auth context
alter view api.v1_spots set (security_invoker = true);

-- permissions (match current environment)
grant usage on schema api to authenticated, anon;
grant select on api.v1_spots to authenticated, anon;
