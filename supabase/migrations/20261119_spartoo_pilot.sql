-- Only reward administrators participate in the pre-launch pilot.
create table public.spartoo_pilot_clicks (
  ref uuid primary key default gen_random_uuid(),
  member uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.spartoo_pilot_clicks enable row level security;
revoke all on public.spartoo_pilot_clicks from public, anon, authenticated;

create function public.start_spartoo_pilot(p_deal_id integer) returns text
language plpgsql security definer set search_path = '' as $$
declare
  link text;
  click_id uuid;
begin
  if not exists(select 1 from public.reward_admins where user_id = auth.uid()) then
    raise exception 'Piloten är bara öppen för testkonton';
  end if;
  select affiliate_url into strict link from public.deals
    where id = p_deal_id and lower(store) in ('spartoo','spartoo se')
      and valid_to >= (now() at time zone 'Europe/Stockholm')::date
      and affiliate_url ~ '^https://www[.]awin1[.]com/pclick[.]php[?]p=[0-9]+&a=3149456&m=27159$';
  insert into public.spartoo_pilot_clicks(member) values (auth.uid()) returning ref into click_id;
  return link || '&clickref=' || click_id;
end;
$$;
revoke all on function public.start_spartoo_pilot(integer) from public, anon;
grant execute on function public.start_spartoo_pilot(integer) to authenticated;

create unique index reward_spartoo_pilot_tx on public.reward_transactions(external_reference)
where external_reference like 'awin:27159:%';

-- Called only by the trusted importer with the latest Awin response.
create function public.sync_spartoo_pilot(p_tx bigint, p_click uuid, p_state text, p_commission numeric)
returns text language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  ref text := 'awin:27159:' || p_tx;
  entry public.reward_transactions%rowtype;
  target integer;
  used integer;
  new_status text;
begin
  if p_tx is null or p_tx <= 0 or p_commission is null or p_commission < 0
    or p_state is null or p_state not in ('pending','approved','declined') then
    raise exception 'Ogiltig transaktion';
  end if;
  select member into strict owner_id from public.spartoo_pilot_clicks c where c.ref = p_click;
  perform pg_advisory_xact_lock(p_tx);
  select * into entry from public.reward_transactions where external_reference = ref for update;
  if found and entry.user_id <> owner_id then raise exception 'Medlemskopplingen har ändrats'; end if;
  target := floor(p_commission * 10);
  if p_state = 'declined' or target = 0 then
    if entry.id is null then return 'Inga poäng'; end if;
    if entry.status in ('available','pending') and entry.points_remaining < entry.points then
      raise exception 'Inlösta poäng behöver stämmas av manuellt';
    end if;
    update public.reward_transactions set points_remaining=0,status='cancelled',updated_at=now() where id=entry.id;
    return 'Annullerad';
  end if;
  new_status := case when p_state='approved' then 'available' else 'pending' end;
  if entry.id is null then
    insert into public.reward_transactions(user_id,store_name,transaction_type,status,points,points_remaining,
      external_reference,description,earned_at,expires_at,available_at)
    values(owner_id,'Spartoo','earn',new_status,target,target,ref,'Spartoo · pilotköp',now(),
      now()+interval '12 months',case when new_status='available' then now() end);
  else
    used := case when entry.status='cancelled' then 0 else entry.points-entry.points_remaining end;
    if used > target or (used > 0 and new_status='pending') then
      raise exception 'Inlösta poäng behöver stämmas av manuellt';
    end if;
    update public.reward_transactions set points=target,points_remaining=target-used,status=new_status,
      available_at=case when new_status='available' then coalesce(available_at,now()) end,updated_at=now()
    where id=entry.id;
  end if;
  return new_status;
end;
$$;
revoke all on function public.sync_spartoo_pilot(bigint,uuid,text,numeric) from public, anon, authenticated;
grant execute on function public.sync_spartoo_pilot(bigint,uuid,text,numeric) to service_role;
