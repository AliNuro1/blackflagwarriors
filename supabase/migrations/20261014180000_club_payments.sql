-- Black Flag Warriors player payments
-- Apply with `supabase db push` or the SQL editor (see README).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('player', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'charge_category') then
    create type public.charge_category as enum (
      'match_fee',
      'training',
      'league_subs',
      'kit',
      'fine',
      'social'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'charge_status') then
    create type public.charge_status as enum ('open', 'partial', 'paid', 'void');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  phone_e164 text not null unique
    check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  role public.user_role not null default 'player',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Club members. id is the user ID (match auth.users.id when using Supabase Auth).';

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete restrict,
  description text not null check (char_length(btrim(description)) between 1 and 280),
  category public.charge_category not null,
  amount_pence integer not null check (amount_pence > 0),
  due_on date not null,
  status public.charge_status not null default 'open',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists charges_player_id_idx on public.charges (player_id);
create index if not exists charges_status_idx on public.charges (status);
create index if not exists charges_due_on_idx on public.charges (due_on);
create index if not exists charges_player_open_idx
  on public.charges (player_id)
  where status in ('open', 'partial');

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete restrict,
  amount_pence integer not null check (amount_pence > 0),
  currency char(3) not null default 'gbp' check (currency = lower(currency)),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_player_id_idx on public.payments (player_id);
create index if not exists payments_status_idx on public.payments (status);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  charge_id uuid not null references public.charges(id) on delete restrict,
  amount_pence integer not null check (amount_pence > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, charge_id)
);

create index if not exists payment_allocations_charge_id_idx
  on public.payment_allocations (charge_id);
create index if not exists payment_allocations_payment_id_idx
  on public.payment_allocations (payment_id);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create or replace function public.allocated_pence(p_charge_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(a.amount_pence), 0)::integer
  from public.payment_allocations a
  join public.payments p on p.id = a.payment_id
  where a.charge_id = p_charge_id
    and p.status in ('pending', 'succeeded');
$$;

create or replace function public.refresh_charge_status(p_charge_id uuid)
returns void
language plpgsql
as $$
declare
  charge_row public.charges%rowtype;
  settled integer;
begin
  select * into charge_row from public.charges where id = p_charge_id for update;
  if not found then
    return;
  end if;
  if charge_row.status = 'void' then
    return;
  end if;

  select coalesce(sum(a.amount_pence), 0)::integer
    into settled
  from public.payment_allocations a
  join public.payments p on p.id = a.payment_id
  where a.charge_id = p_charge_id
    and p.status = 'succeeded';

  if settled <= 0 then
    update public.charges set status = 'open' where id = p_charge_id;
  elsif settled < charge_row.amount_pence then
    update public.charges set status = 'partial' where id = p_charge_id;
  else
    update public.charges set status = 'paid' where id = p_charge_id;
  end if;
end;
$$;

create or replace function public.assert_allocation_capacity()
returns trigger
language plpgsql
as $$
declare
  charge_amount integer;
  payment_amount integer;
  payment_player uuid;
  charge_player uuid;
  charge_status public.charge_status;
  allocated_other integer;
  payment_other integer;
begin
  select amount_pence, player_id, status
    into charge_amount, charge_player, charge_status
  from public.charges
  where id = new.charge_id
  for update;

  if not found then
    raise exception 'Charge % does not exist', new.charge_id;
  end if;
  if charge_status = 'void' then
    raise exception 'Cannot allocate to a void charge';
  end if;

  select amount_pence, player_id
    into payment_amount, payment_player
  from public.payments
  where id = new.payment_id
  for update;

  if payment_player is distinct from charge_player then
    raise exception 'Payment and charge belong to different players';
  end if;

  select coalesce(sum(a.amount_pence), 0)::integer
    into allocated_other
  from public.payment_allocations a
  join public.payments p on p.id = a.payment_id
  where a.charge_id = new.charge_id
    and a.id is distinct from new.id
    and p.status in ('pending', 'succeeded');

  if allocated_other + new.amount_pence > charge_amount then
    raise exception 'Allocation exceeds remaining charge balance';
  end if;

  select coalesce(sum(amount_pence), 0)::integer
    into payment_other
  from public.payment_allocations
  where payment_id = new.payment_id
    and id is distinct from new.id;

  if payment_other + new.amount_pence > payment_amount then
    raise exception 'Allocations exceed payment amount';
  end if;

  return new;
end;
$$;

drop trigger if exists payment_allocations_capacity on public.payment_allocations;
create trigger payment_allocations_capacity
  before insert or update on public.payment_allocations
  for each row execute function public.assert_allocation_capacity();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    or (
      auth.uid() is null
      and current_setting('is_superuser', true) = 'on'
    );
$$;

create or replace function public.begin_checkout(
  p_player_id uuid,
  p_charge_ids uuid[],
  p_stripe_checkout_session_id text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments;
  charge_row public.charges;
  remaining integer;
  total integer := 0;
  charge_id uuid;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_player_id and not public.is_admin() then
    raise exception 'Not allowed to start checkout for another player';
  end if;
  if auth.uid() is null and not public.is_service_role() then
    raise exception 'Not allowed to start checkout';
  end if;
  if p_charge_ids is null or array_length(p_charge_ids, 1) is null then
    raise exception 'Select at least one charge';
  end if;

  foreach charge_id in array p_charge_ids
  loop
    select * into charge_row from public.charges where id = charge_id for update;
    if not found or charge_row.player_id is distinct from p_player_id then
      raise exception 'Charge is not payable by this player';
    end if;
    if charge_row.status not in ('open', 'partial') then
      raise exception 'Charge is not open';
    end if;
    remaining := charge_row.amount_pence - public.allocated_pence(charge_id);
    if remaining <= 0 then
      raise exception 'Charge has no remaining balance';
    end if;
    total := total + remaining;
  end loop;

  insert into public.payments (
    player_id,
    amount_pence,
    currency,
    stripe_checkout_session_id,
    status
  )
  values (
    p_player_id,
    total,
    'gbp',
    p_stripe_checkout_session_id,
    'pending'
  )
  returning * into payment_row;

  foreach charge_id in array p_charge_ids
  loop
    select * into charge_row from public.charges where id = charge_id;
    remaining := charge_row.amount_pence - public.allocated_pence(charge_id);
    insert into public.payment_allocations (payment_id, charge_id, amount_pence)
    values (payment_row.id, charge_id, remaining);
  end loop;

  return payment_row;
end;
$$;

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
  if inserted = 0 then
    return false;
  end if;

  if p_event_type = 'checkout.session.completed' and p_stripe_checkout_session_id is not null then
    perform public.complete_payment(
      p_stripe_checkout_session_id => p_stripe_checkout_session_id,
      p_stripe_payment_intent_id => p_stripe_payment_intent_id
    );
  end if;

  return true;
end;
$$;

create or replace function public.create_charges_for_players(
  p_player_ids uuid[],
  p_description text,
  p_category public.charge_category,
  p_amount_pence integer,
  p_due_on date
)
returns setof public.charges
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and not public.is_service_role() then
    raise exception 'Only an admin or the server may create charges';
  end if;

  return query
  insert into public.charges (
    player_id,
    description,
    category,
    amount_pence,
    due_on,
    status,
    created_by
  )
  select
    unnest(p_player_ids),
    p_description,
    p_category,
    p_amount_pence,
    p_due_on,
    'open',
    auth.uid()
  returning *;
end;
$$;

revoke all on function public.begin_checkout(uuid, uuid[], text) from public;
revoke all on function public.complete_payment(uuid, text, text) from public;
revoke all on function public.ingest_stripe_event(text, text, jsonb, text, text) from public;
revoke all on function public.create_charges_for_players(uuid[], text, public.charge_category, integer, date) from public;

grant execute on function public.begin_checkout(uuid, uuid[], text) to service_role;
grant execute on function public.complete_payment(uuid, text, text) to service_role, authenticated;
grant execute on function public.ingest_stripe_event(text, text, jsonb, text, text) to service_role;
grant execute on function public.create_charges_for_players(uuid[], text, public.charge_category, integer, date)
  to service_role, authenticated;

alter table public.profiles enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.stripe_webhook_events enable row level security;

alter table public.profiles force row level security;
alter table public.charges force row level security;
alter table public.payments force row level security;
alter table public.payment_allocations force row level security;
alter table public.stripe_webhook_events force row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
  on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists charges_select_own_or_admin on public.charges;
create policy charges_select_own_or_admin
  on public.charges
  for select
  to authenticated
  using (player_id = auth.uid() or public.is_admin());

drop policy if exists charges_write_admin on public.charges;
create policy charges_write_admin
  on public.charges
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists charges_update_admin on public.charges;
create policy charges_update_admin
  on public.charges
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payments_select_own_or_admin on public.payments;
create policy payments_select_own_or_admin
  on public.payments
  for select
  to authenticated
  using (player_id = auth.uid() or public.is_admin());

drop policy if exists allocations_select_own_or_admin on public.payment_allocations;
create policy allocations_select_own_or_admin
  on public.payment_allocations
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.payments p
      where p.id = payment_id
        and p.player_id = auth.uid()
    )
  );

-- stripe_webhook_events: RLS on, no policies for anon/authenticated.

grant usage on schema public to anon, authenticated, service_role;
grant usage on type public.user_role, public.charge_category, public.charge_status, public.payment_status
  to authenticated, service_role;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.charges from public, anon, authenticated;
revoke all on table public.payments from public, anon, authenticated;
revoke all on table public.payment_allocations from public, anon, authenticated;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant select, insert, update on table public.charges to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.payment_allocations to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.charges to service_role;
grant all on table public.payments to service_role;
grant all on table public.payment_allocations to service_role;
grant all on table public.stripe_webhook_events to service_role;
