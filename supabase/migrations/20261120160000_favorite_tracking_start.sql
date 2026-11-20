-- Null denotes a price captured by the existing favorite insert trigger.
alter table public.favorites add column if not exists tracking_started_on date;

create or replace function public.start_favorite_price_tracking()
returns void language sql security definer set search_path = '' as $$
  update public.favorites f
     set saved_price = d.price,
         tracking_started_on = (now() at time zone 'Europe/Stockholm')::date
    from public.deals d
   where f.user_id = (select auth.uid())
     and f.deal_id = d.id and f.saved_price is null and d.price > 0
     and d.valid_to >= (now() at time zone 'Europe/Stockholm')::date;
$$;
revoke all on function public.start_favorite_price_tracking() from public, anon;
grant execute on function public.start_favorite_price_tracking() to authenticated;
