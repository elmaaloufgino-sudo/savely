alter table public.reward_transactions add column spartoo_return_until date;

-- Keep already-imported pilot awards pending until their return deadline is verified.
do $$
begin
  if exists (
    select 1 from public.reward_transactions
    where external_reference like 'awin:27159:%' and status='available' and points_remaining < points
  ) then
    raise exception 'Stäm av redan inlösta pilotpoäng före migreringen';
  end if;
end;
$$;
update public.reward_transactions set status='pending',available_at=null,updated_at=now()
where external_reference like 'awin:27159:%' and status='available';

alter table public.reward_transactions add constraint spartoo_pilot_requires_closed_return_period check (
  external_reference not like 'awin:27159:%' or status <> 'available' or (
    spartoo_return_until is not null and available_at is not null
    and (available_at at time zone 'Europe/Stockholm')::date > spartoo_return_until
  )
);

create function public.sync_spartoo_pilot(p_tx bigint, p_click uuid, p_state text, p_commission numeric, p_return_until date)
returns text language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  ref text := 'awin:27159:' || p_tx;
  entry public.reward_transactions%rowtype;
  target integer;
  used integer;
  new_status text;
  return_until date;
begin
  if p_tx is null or p_tx <= 0 or p_commission is null or p_commission < 0
    or p_state is null or p_state not in ('pending','approved','declined') then
    raise exception 'Ogiltig transaktion';
  end if;
  select member into strict owner_id from public.spartoo_pilot_clicks c where c.ref = p_click;
  perform pg_advisory_xact_lock(p_tx);
  select * into entry from public.reward_transactions where external_reference = ref for update;
  if found and entry.user_id <> owner_id then raise exception 'Medlemskopplingen har ändrats'; end if;
  return_until := coalesce(p_return_until, entry.spartoo_return_until);
  if return_until is not null and not isfinite(return_until) then
    raise exception 'Ogiltig returfrist';
  end if;
  target := floor(p_commission * 10);
  if p_state = 'declined' or target = 0 then
    if entry.id is null then return 'Inga poäng'; end if;
    if entry.status in ('available','pending') and entry.points_remaining < entry.points then
      raise exception 'Inlösta poäng behöver stämmas av manuellt';
    end if;
    update public.reward_transactions set points_remaining=0,status='cancelled',updated_at=now() where id=entry.id;
    return 'Annullerad';
  end if;
  new_status := case when p_state='approved'
    and (now() at time zone 'Europe/Stockholm')::date > return_until
    then 'available' else 'pending' end;
  if entry.id is null then
    insert into public.reward_transactions(user_id,store_name,transaction_type,status,points,points_remaining,
      external_reference,description,earned_at,expires_at,available_at,spartoo_return_until)
    values(owner_id,'Spartoo','earn',new_status,target,target,ref,'Spartoo · pilotköp',now(),
      now()+interval '12 months',case when new_status='available' then now() end,return_until);
  else
    used := case when entry.status='cancelled' then 0 else entry.points-entry.points_remaining end;
    if used > target or (used > 0 and new_status='pending') then
      raise exception 'Inlösta poäng behöver stämmas av manuellt';
    end if;
    update public.reward_transactions set points=target,points_remaining=target-used,status=new_status,
      available_at=case when new_status='available' then
        case when (available_at at time zone 'Europe/Stockholm')::date > return_until
          then available_at else now() end
      end,
      spartoo_return_until=return_until,updated_at=now()
    where id=entry.id;
  end if;
  return new_status;
end;
$$;
revoke all on function public.sync_spartoo_pilot(bigint,uuid,text,numeric,date) from public, anon, authenticated;
grant execute on function public.sync_spartoo_pilot(bigint,uuid,text,numeric,date) to service_role;

-- Older import commands still work, but cannot bypass the return deadline.
create or replace function public.sync_spartoo_pilot(p_tx bigint, p_click uuid, p_state text, p_commission numeric)
returns text language sql set search_path = '' as $$
  select public.sync_spartoo_pilot(p_tx, p_click, p_state, p_commission, null::date);
$$;
