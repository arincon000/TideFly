create or replace function public.search_airports(q text, max_results integer default 8)
returns table(iata text, name text, city text, country text)
language sql
stable
as $$
  with norm as (
    select trim(public.immutable_unaccent(lower(q)))  as qnorm,
           length(trim(public.immutable_unaccent(lower(q)))) as qlen
  ),
  scored as (
    select
      a.iata, a.name, a.city, a.country,
      -- scoring flags
      (public.immutable_unaccent(lower(a.iata)) like (select qnorm from norm) || '%')::int  as iata_prefix,
      (public.immutable_unaccent(lower(a.city)) like (select qnorm from norm) || '%')::int  as city_prefix,
      (public.immutable_unaccent(lower(a.name)) like (select qnorm from norm) || '%')::int  as name_prefix,
      greatest(
        similarity(public.immutable_unaccent(lower(a.city)), (select qnorm from norm)),
        similarity(public.immutable_unaccent(lower(a.name)), (select qnorm from norm))
      ) as sim
    from public.airports a, norm
    where a.iata is not null and a.iata <> ''
      and (
        -- Case 1: 3-letter code → IATA-only (fast & precise)
        (norm.qlen = 3 and public.immutable_unaccent(lower(a.iata)) like norm.qnorm || '%')
        -- Case 2: longer text → city/name prefix or stronger similarity
        or (norm.qlen <> 3 and (
              public.immutable_unaccent(lower(a.city)) like norm.qnorm || '%'
           or public.immutable_unaccent(lower(a.name)) like norm.qnorm || '%'
           or similarity(public.immutable_unaccent(lower(a.city)), norm.qnorm) > 0.50
           or similarity(public.immutable_unaccent(lower(a.name)), norm.qnorm) > 0.50
        ))
      )
  )
  select iata, name, city, country
  from scored
  order by
    iata_prefix desc,      -- prefer IATA when it matches
    city_prefix desc,      -- then city prefix
    name_prefix desc,      -- then name prefix
    sim desc,              -- then best fuzzy score
    iata
  limit max_results;
$$;

-- keep privileges consistent
revoke all on function public.search_airports(text, integer) from public;
grant execute on function public.search_airports(text, integer) to authenticated, service_role;
