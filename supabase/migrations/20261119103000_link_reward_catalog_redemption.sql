alter table public.reward_transactions
  add column reward_redemption_id uuid references public.reward_redemptions(id) on delete set null;

CREATE OR REPLACE FUNCTION public.redeem_catalog_reward(p_reward_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_reward public.reward_catalog%rowtype;
  v_available integer;
  v_remaining integer;
  v_lot record;
  v_redemption_id uuid;
begin
  select * into v_reward
  from public.reward_catalog
  where id = p_reward_id
    and active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (stock_quantity is null or stock_quantity > 0)
  for update;

  if not found then
    raise exception 'Reward is not available';
  end if;

  if v_reward.points_cost < 2500 then
    raise exception 'Reward does not meet minimum redemption rules';
  end if;

  select coalesce(sum(points_remaining),0)::integer into v_available
  from public.reward_transactions
  where user_id = auth.uid()
    and transaction_type = 'earn'
    and status = 'available'
    and points_remaining > 0
    and (expires_at is null or expires_at > now());

  if v_available < v_reward.points_cost then
    raise exception 'Insufficient available points';
  end if;

  insert into public.reward_redemptions(user_id,reward_id,points_spent,status)
  values(auth.uid(),p_reward_id,v_reward.points_cost,'requested')
  returning id into v_redemption_id;

  insert into public.reward_redemption_events(
    redemption_id, actor_user_id, from_status, to_status, event_type
  )
  values(v_redemption_id, auth.uid(), null, 'requested', 'requested');

  insert into public.reward_transactions(
    user_id,transaction_type,status,points,points_remaining,description,reward_redemption_id
  )
  values(
    auth.uid(),'redeem','redeemed',v_reward.points_cost,0,
    'Inlösen: ' || v_reward.name,
    v_redemption_id
  );

  v_remaining := v_reward.points_cost;

  for v_lot in
    select id,points_remaining
    from public.reward_transactions
    where user_id = auth.uid()
      and transaction_type = 'earn'
      and status = 'available'
      and points_remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at nulls last, available_at nulls last, earned_at nulls last, created_at
    for update
  loop
    exit when v_remaining = 0;

    if v_lot.points_remaining <= v_remaining then
      insert into public.reward_redemption_allocations(redemption_id,earn_transaction_id,points_used)
      values(v_redemption_id,v_lot.id,v_lot.points_remaining);

      update public.reward_transactions
      set points_remaining=0,updated_at=now()
      where id=v_lot.id;

      v_remaining := v_remaining-v_lot.points_remaining;
    else
      insert into public.reward_redemption_allocations(redemption_id,earn_transaction_id,points_used)
      values(v_redemption_id,v_lot.id,v_remaining);

      update public.reward_transactions
      set points_remaining=points_remaining-v_remaining,updated_at=now()
      where id=v_lot.id;

      v_remaining := 0;
    end if;
  end loop;

  if v_remaining <> 0 then
    raise exception 'FIFO allocation failed';
  end if;

  if v_reward.stock_quantity is not null then
    update public.reward_catalog
    set stock_quantity=stock_quantity-1,updated_at=now()
    where id=p_reward_id and stock_quantity>0;

    if not found then
      raise exception 'Reward is out of stock';
    end if;
  end if;

  return v_redemption_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_reward_redemption_status(p_redemption_id uuid, p_new_status text, p_admin_note text DEFAULT NULL::text, p_fulfillment_reference text DEFAULT NULL::text)
 RETURNS reward_redemptions
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_redemption public.reward_redemptions%rowtype;
  v_old_status text;
  v_restore record;
  v_expired_allocations integer;
begin
  if auth.uid() is null or not private.is_reward_admin(auth.uid()) then
    raise exception 'Not authorized to manage reward redemptions';
  end if;

  if p_new_status not in ('processing','fulfilled','rejected','cancelled') then
    raise exception 'Invalid redemption status';
  end if;

  select * into v_redemption
  from public.reward_redemptions
  where id = p_redemption_id
  for update;

  if not found then raise exception 'Redemption not found'; end if;

  v_old_status := v_redemption.status;

  if v_old_status = p_new_status then raise exception 'Redemption already has this status'; end if;
  if v_old_status in ('fulfilled','rejected','cancelled') then raise exception 'Terminal redemption status cannot be changed'; end if;

  if v_old_status = 'requested' and p_new_status not in ('processing','rejected','cancelled') then
    raise exception 'Requested redemptions must move to processing, rejected or cancelled';
  end if;

  if v_old_status = 'processing' and p_new_status not in ('fulfilled','rejected','cancelled') then
    raise exception 'Processing redemptions must be fulfilled, rejected or cancelled';
  end if;

  if p_new_status in ('rejected','cancelled') then
    select count(*) into v_expired_allocations
    from public.reward_redemption_allocations a
    join public.reward_transactions t on t.id = a.earn_transaction_id
    where a.redemption_id = p_redemption_id
      and t.expires_at is not null
      and t.expires_at <= now();

    if v_expired_allocations > 0 then
      raise exception 'Cannot automatically restore expired point lots; manual resolution required';
    end if;

    for v_restore in
      select earn_transaction_id, points_used
      from public.reward_redemption_allocations
      where redemption_id = p_redemption_id
    loop
      update public.reward_transactions
      set points_remaining = points_remaining + v_restore.points_used,
          updated_at = now()
      where id = v_restore.earn_transaction_id;
    end loop;

    update public.reward_transactions
    set status = 'cancelled',
        updated_at = now()
    where reward_redemption_id = p_redemption_id
      and transaction_type = 'redeem'
      and status = 'redeemed';
  end if;

  update public.reward_redemptions
  set status = p_new_status,
      admin_note = coalesce(p_admin_note, admin_note),
      fulfillment_reference = coalesce(p_fulfillment_reference, fulfillment_reference),
      processed_at = case when p_new_status = 'processing' then now() else processed_at end,
      fulfilled_at = case when p_new_status = 'fulfilled' then now() else fulfilled_at end,
      cancelled_at = case when p_new_status in ('cancelled','rejected') then now() else cancelled_at end,
      updated_at = now()
  where id = p_redemption_id
  returning * into v_redemption;

  insert into public.reward_redemption_events(
    redemption_id, actor_user_id, from_status, to_status, event_type, note, fulfillment_reference
  )
  values (
    p_redemption_id, auth.uid(), v_old_status, p_new_status,
    case p_new_status
      when 'fulfilled' then 'fulfilled'
      when 'rejected' then 'rejected'
      when 'cancelled' then 'cancelled'
      else 'status_changed'
    end,
    p_admin_note, p_fulfillment_reference
  );

  return v_redemption;
end;
$function$
;
