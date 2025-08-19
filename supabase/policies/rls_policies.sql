-- Users own their alert_rules
alter table if exists public.alert_rules enable row level security;

create policy "alert_rules read own"
on public.alert_rules for select
using (auth.uid() = user_id);

create policy "alert_rules insert own"
on public.alert_rules for insert
with check (auth.uid() = user_id);

create policy "alert_rules update own"
on public.alert_rules for update
using (auth.uid() = user_id);

-- Events are readable if they belong to user's rules
alter table if exists public.alert_events enable row level security;

create policy "alert_events read own via rules"
on public.alert_events for select
using (
  exists (
    select 1
    from public.alert_rules r
    where r.id = alert_events.rule_id
      and r.user_id = auth.uid()
  )
);

-- Spots may be public (optional)
alter table if exists public.spots enable row level security;
create policy "spots readable"
on public.spots for select
to anon, authenticated
using (true);
