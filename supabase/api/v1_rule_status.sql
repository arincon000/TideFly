create schema if not exists api;

create or replace view api.v1_rule_status as
  select distinct on (e.rule_id)
    e.rule_id,
    e.status,
    e.price,
    e.ok_dates_count,
    e.ok_dates,
    e.snapped_depart_date,
    e.snapped_return_date,
    s.first_ok,
    s.last_ok,
    s.ok_count,
    e.tier,
    e.reason
  from public.alert_events e
  left join public.alert_rule_summaries s on s.rule_id = e.rule_id
  order by e.rule_id, e.sent_at desc;

alter view api.v1_rule_status set (security_invoker = true);
grant usage on schema api to authenticated, anon;
grant select on api.v1_rule_status to authenticated, anon;