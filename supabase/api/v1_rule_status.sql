create or replace view api.v1_rule_status as
  select distinct on (rule_id)
    rule_id,
    status,
    price,
    ok_dates_count,
    tier,
    reason,
    created_at
  from public.alert_events
  order by rule_id, created_at desc;

alter view api.v1_rule_status set (security_invoker = true);
