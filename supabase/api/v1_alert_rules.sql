create schema if not exists api;

create or replace view api.v1_alert_rules as
SELECT id,
    user_id,
    name,
    mode,
    spot_id,
    regions,
    origin_iata,
    dest_iata,
    wave_min_m,
    wind_max_kmh,
    min_nights,
    max_nights,
    max_price_eur,
    forecast_window,
    days_mask,
    date_from,
    date_to,
    cooldown_hours,
    is_active,
    paused_until,
    expires_at,
    created_at,
    updated_at,
    destination_iata,
    wave_max_m,
    depart_date,
    return_date,
    price_max_usd,
    last_checked_at,
    last_notified_at
   FROM alert_rules;

-- ensure correct auth context
alter view api.v1_alert_rules set (security_invoker = true);

-- permissions (match current environment)
grant usage on schema api to authenticated, anon;
grant select on api.v1_alert_rules to authenticated, anon;
