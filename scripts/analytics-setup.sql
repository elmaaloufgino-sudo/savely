-- Aggregate-only statistics: no visitor IDs, email, IP, full URL, or raw user-agent.
create schema if not exists fyndaren_analytics_private;
revoke all on schema fyndaren_analytics_private from public;
grant usage on schema fyndaren_analytics_private to anon, authenticated;

create table if not exists public.fyndaren_daily_stats (
  day date not null,
  event text not null check (event in ('page_view','product_view','shop_click')),
  page text not null check (page in ('home','app','catalog','deal','newsletter','other')),
  deal_id integer not null check (deal_id >= 0),
  source text not null check (source in ('direct','internal','google','facebook','instagram','other_search','other')),
  device text not null check (device in ('mobile','tablet','desktop')),
  event_count bigint not null default 1 check (event_count > 0),
  primary key (day,event,page,deal_id,source,device)
);
alter table public.fyndaren_daily_stats enable row level security;
revoke all on public.fyndaren_daily_stats from public, anon, authenticated;
grant select on public.fyndaren_daily_stats to authenticated;
create policy "only admins read aggregate stats" on public.fyndaren_daily_stats
for select to authenticated using (exists (select 1 from public.admins a where a.user_id=(select auth.uid())));

-- Only this narrow function can increment counters; the private schema is not exposed via REST.
create or replace function fyndaren_analytics_private.increment_stat(p_event text,p_page text,p_deal integer,p_source text,p_device text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_event is null or p_event not in ('page_view','product_view','shop_click')
     or p_page is null or p_page not in ('home','app','catalog','deal','newsletter','other')
     or p_source is null or p_source not in ('direct','internal','google','facebook','instagram','other_search','other')
     or p_device is null or p_device not in ('mobile','tablet','desktop')
     or p_deal is null or p_deal < 0 then return; end if;
  if p_deal > 0 and not exists(select 1 from public.deals where id=p_deal) then return; end if;
  if p_event='product_view' and p_deal=0 then return; end if;
  insert into public.fyndaren_daily_stats(day,event,page,deal_id,source,device)
  values ((now() at time zone 'Europe/Stockholm')::date,p_event,p_page,p_deal,p_source,p_device)
  on conflict(day,event,page,deal_id,source,device)
  do update set event_count=public.fyndaren_daily_stats.event_count+1;
end;
$$;
revoke all on function fyndaren_analytics_private.increment_stat(text,text,integer,text,text) from public;
grant execute on function fyndaren_analytics_private.increment_stat(text,text,integer,text,text) to anon,authenticated;

create or replace function public.record_fyndaren_stat(p_event text,p_page text,p_deal integer,p_source text,p_device text)
returns void language sql security invoker set search_path = '' as $$
 select fyndaren_analytics_private.increment_stat(p_event,p_page,p_deal,p_source,p_device);
$$;
revoke all on function public.record_fyndaren_stat(text,text,integer,text,text) from public;
grant execute on function public.record_fyndaren_stat(text,text,integer,text,text) to anon,authenticated;

create or replace function public.get_fyndaren_stats(p_days integer default 7)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare start_day date; end_day date; result jsonb;
begin
 if not exists(select 1 from public.admins a where a.user_id=(select auth.uid())) then
   raise exception 'Admin access required' using errcode='42501';
 end if;
 end_day := (now() at time zone 'Europe/Stockholm')::date;
 start_day := end_day - (greatest(1,least(coalesce(p_days,7),90))-1);
 with rows as (select * from public.fyndaren_daily_stats where day between start_day and end_day)
 select jsonb_build_object(
 'totals',coalesce((select jsonb_object_agg(event,n) from (select event,sum(event_count) n from rows group by event) a),'{}'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(a) order by day) from (select day, sum(event_count) filter(where event='page_view') as views, sum(event_count) filter(where event='product_view') as products,sum(event_count) filter(where event='shop_click') as clicks from rows group by day) a),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(a) order by n desc) from (select source,sum(event_count) n from rows where event='page_view' group by source) a),'[]'::jsonb),
 'devices',coalesce((select jsonb_agg(to_jsonb(a) order by n desc) from (select device,sum(event_count) n from rows where event='page_view' group by device) a),'[]'::jsonb),
 'top',coalesce((select jsonb_agg(to_jsonb(a) order by views desc nulls last,clicks desc nulls last) from (select r.deal_id,coalesce(d.name,'Borttaget erbjudande') name,coalesce(d.store,'') store,sum(r.event_count) filter(where r.event='product_view') views,sum(r.event_count) filter(where r.event='shop_click') clicks from rows r left join public.deals d on d.id=r.deal_id where r.deal_id>0 and r.event in ('product_view','shop_click') group by r.deal_id,d.name,d.store order by views desc nulls last,clicks desc nulls last limit 15) a),'[]'::jsonb)
 ) into result;
 return result;
end;
$$;
revoke all on function public.get_fyndaren_stats(integer) from public,anon;
grant execute on function public.get_fyndaren_stats(integer) to authenticated;
