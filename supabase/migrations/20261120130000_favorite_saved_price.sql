-- Existing favorites have no known historical purchase price.
begin;
alter table public.favorites add column if not exists saved_price numeric;
create or replace function public.capture_favorite_price()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  select price into new.saved_price from public.deals where id = new.deal_id;
  return new;
end;
$$;
drop trigger if exists capture_favorite_price on public.favorites;
create trigger capture_favorite_price before insert on public.favorites
for each row execute function public.capture_favorite_price();
commit;
