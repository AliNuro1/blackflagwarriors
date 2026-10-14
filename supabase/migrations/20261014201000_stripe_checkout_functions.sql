-- Stripe Checkout: one open session per player, unique webhook ingest without
-- auto-confirm, abandon terminal states, complete only from pending.

create unique index if not exists payments_one_open_checkout
  on public.payments (player_id)
  where status = 'pending' and stripe_checkout_session_id is not null;

create or replace function public.ingest_stripe_event(
  p_stripe_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_stripe_checkout_session_id text default null,
  p_stripe_payment_intent_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer := 0;
begin
  if not public.is_service_role() then
    raise exception 'Only the server may ingest Stripe events';
  end if;

  insert into public.stripe_webhook_events (stripe_event_id, event_type, payload)
  values (p_stripe_event_id, p_event_type, coalesce(p_payload, '{}'::jsonb))
  on conflict (stripe_event_id) do nothing;

  get diagnostics inserted = row_count;
  return inserted > 0;
end;
$$;

comment on function public.ingest_stripe_event(text, text, jsonb, text, text) is
  'Records a Stripe event ID uniquely. Settlement is applied by the server after signature, amount and ownership checks.';

create or replace function public.complete_payment(
  p_payment_id uuid default null,
  p_stripe_checkout_session_id text default null,
  p_stripe_payment_intent_id text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments;
  allocation record;
begin
  if not public.is_service_role() and not public.is_admin() then
    raise exception 'Only the server or an admin may reconcile payments';
  end if;

  if p_payment_id is not null then
    select * into payment_row from public.payments where id = p_payment_id for update;
  elsif p_stripe_checkout_session_id is not null then
    select * into payment_row
    from public.payments
    where stripe_checkout_session_id = p_stripe_checkout_session_id
    for update;
  else
    raise exception 'Payment identifier required';
  end if;

  if not found then
    raise exception 'Payment not found';
  end if;

  if payment_row.status = 'succeeded' then
    if p_stripe_payment_intent_id is not null
      and payment_row.stripe_payment_intent_id is null then
      update public.payments
        set stripe_payment_intent_id = p_stripe_payment_intent_id
        where id = payment_row.id
        returning * into payment_row;
    end if;
    return payment_row;
  end if;

  if payment_row.status <> 'pending' then
    return payment_row;
  end if;

  update public.payments
    set status = 'succeeded',
        stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id)
    where id = payment_row.id
    returning * into payment_row;

  for allocation in
    select charge_id from public.payment_allocations where payment_id = payment_row.id
  loop
    perform public.refresh_charge_status(allocation.charge_id);
  end loop;

  return payment_row;
end;
$$;

create or replace function public.abandon_payment(
  p_payment_id uuid default null,
  p_stripe_checkout_session_id text default null,
  p_status public.payment_status default 'failed'
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments;
  allocation record;
begin
  if not public.is_service_role() then
    raise exception 'Only the server may abandon a checkout';
  end if;

  if p_status not in ('failed', 'cancelled', 'expired') then
    raise exception 'Invalid abandon status';
  end if;

  if p_payment_id is not null then
    select * into payment_row from public.payments where id = p_payment_id for update;
  elsif p_stripe_checkout_session_id is not null then
    select * into payment_row
    from public.payments
    where stripe_checkout_session_id = p_stripe_checkout_session_id
    for update;
  else
    raise exception 'Payment identifier required';
  end if;

  if not found then
    raise exception 'Payment not found';
  end if;

  if payment_row.status = 'succeeded' then
    raise exception 'Cannot abandon a confirmed payment';
  end if;

  if payment_row.status <> 'pending' then
    return payment_row;
  end if;

  update public.payments
    set status = p_status
    where id = payment_row.id
    returning * into payment_row;

  for allocation in
    select charge_id from public.payment_allocations where payment_id = payment_row.id
  loop
    perform public.refresh_charge_status(allocation.charge_id);
  end loop;

  return payment_row;
end;
$$;

revoke all on function public.abandon_payment(uuid, text, public.payment_status) from public;
grant execute on function public.abandon_payment(uuid, text, public.payment_status) to service_role;
