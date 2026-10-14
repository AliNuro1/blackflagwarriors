-- Administrator dashboard: audit log, player/charge RPCs, last-admin protection.
-- Mutations still require the application to pass an active admin actor id.
-- Players cannot grant themselves admin. Payments cannot be deleted.

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (char_length(btrim(action)) between 1 and 80),
  entity_type text not null check (char_length(btrim(entity_type)) between 1 and 40),
  entity_id uuid,
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_created_at_idx
  on public.admin_audit_events (created_at desc);
create index if not exists admin_audit_events_actor_id_idx
  on public.admin_audit_events (actor_id);

comment on table public.admin_audit_events is
  'Administrator actions. Payload must not contain secrets or card data.';

create or replace function public.assert_admin_actor(p_actor_id uuid)
returns public.profiles
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.profiles;
begin
  if p_actor_id is null then
    raise exception 'Administrator actor required';
  end if;
  select * into actor from public.profiles where id = p_actor_id;
  if not found or actor.status <> 'active' or actor.role <> 'admin' then
    raise exception 'Admin access only';
  end if;
  if auth.uid() is not null and auth.uid() is distinct from p_actor_id and not public.is_admin() then
    raise exception 'Admin access only';
  end if;
  return actor;
end;
$$;

create or replace function public.active_admin_count(p_except uuid default null)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.profiles
  where role = 'admin'
    and status = 'active'
    and (p_except is null or id is distinct from p_except);
$$;

create or replace function public.protect_admin_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    if not public.is_service_role() and not public.is_admin() then
      raise exception 'Players cannot change roles';
    end if;
  end if;
  if tg_op = 'UPDATE'
    and old.role = 'admin'
    and old.status = 'active'
    and (new.role is distinct from 'admin' or new.status is distinct from 'active')
    and public.active_admin_count(old.id) = 0 then
    raise exception 'Cannot remove the last active administrator';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Profiles cannot be deleted';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_role on public.profiles;
create trigger profiles_protect_admin_role
  before update or delete on public.profiles
  for each row execute function public.protect_admin_role();

create or replace function public.forbid_payment_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Historical payment records cannot be deleted';
end;
$$;

drop trigger if exists payments_forbid_delete on public.payments;
create trigger payments_forbid_delete
  before delete on public.payments
  for each row execute function public.forbid_payment_delete();

create or replace function public.record_admin_audit(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_summary text default '',
  p_payload jsonb default '{}'::jsonb
)
returns public.admin_audit_events
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.admin_audit_events;
begin
  perform public.assert_admin_actor(p_actor_id);
  insert into public.admin_audit_events (
    actor_id, action, entity_type, entity_id, summary, payload
  )
  values (
    p_actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_summary, ''),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning * into row_out;
  return row_out;
end;
$$;

create or replace function public.create_player(
  p_actor_id uuid,
  p_full_name text,
  p_phone_e164 text,
  p_role public.user_role default 'player',
  p_status text default 'active'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.profiles;
begin
  perform public.assert_admin_actor(p_actor_id);
  if p_role = 'admin' and public.assert_admin_actor(p_actor_id) is null then
    raise exception 'Admin access only';
  end if;
  insert into public.profiles (full_name, phone_e164, role, status)
  values (btrim(p_full_name), p_phone_e164, p_role, p_status)
  returning * into row_out;
  return row_out;
end;
$$;

create or replace function public.update_player(
  p_actor_id uuid,
  p_player_id uuid,
  p_full_name text default null,
  p_phone_e164 text default null,
  p_role public.user_role default null,
  p_status text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.profiles;
begin
  perform public.assert_admin_actor(p_actor_id);
  update public.profiles
    set
      full_name = coalesce(btrim(p_full_name), full_name),
      phone_e164 = coalesce(p_phone_e164, phone_e164),
      role = coalesce(p_role, role),
      status = coalesce(p_status, status)
    where id = p_player_id
    returning * into row_out;
  if not found then
    raise exception 'Player not found';
  end if;
  return row_out;
end;
$$;

create or replace function public.update_charge(
  p_actor_id uuid,
  p_charge_id uuid,
  p_description text default null,
  p_category public.charge_category default null,
  p_due_on date default null,
  p_amount_pence integer default null
)
returns public.charges
language plpgsql
security definer
set search_path = public
as $$
declare
  charge_row public.charges;
  settled integer;
begin
  perform public.assert_admin_actor(p_actor_id);
  select * into charge_row from public.charges where id = p_charge_id for update;
  if not found then
    raise exception 'Charge not found';
  end if;
  if charge_row.status = 'void' then
    raise exception 'Cannot edit a void charge';
  end if;

  settled := public.allocated_pence(p_charge_id);
  if p_amount_pence is not null then
    if p_amount_pence <> charge_row.amount_pence and settled > 0 then
      raise exception 'Cannot change amount after payments have been allocated';
    end if;
    if p_amount_pence < settled then
      raise exception 'Amount cannot be below confirmed allocations';
    end if;
  end if;

  update public.charges
    set
      description = coalesce(btrim(p_description), description),
      category = coalesce(p_category, category),
      due_on = coalesce(p_due_on, due_on),
      amount_pence = coalesce(p_amount_pence, amount_pence)
    where id = p_charge_id
    returning * into charge_row;

  perform public.refresh_charge_status(p_charge_id);
  select * into charge_row from public.charges where id = p_charge_id;
  return charge_row;
end;
$$;

create or replace function public.void_charge(
  p_actor_id uuid,
  p_charge_id uuid
)
returns public.charges
language plpgsql
security definer
set search_path = public
as $$
declare
  charge_row public.charges;
begin
  perform public.assert_admin_actor(p_actor_id);
  select * into charge_row from public.charges where id = p_charge_id for update;
  if not found then
    raise exception 'Charge not found';
  end if;
  update public.charges set status = 'void' where id = p_charge_id
    returning * into charge_row;
  return charge_row;
end;
$$;

revoke all on function public.assert_admin_actor(uuid) from public;
revoke all on function public.record_admin_audit(uuid, text, text, uuid, text, jsonb) from public;
revoke all on function public.create_player(uuid, text, text, public.user_role, text) from public;
revoke all on function public.update_player(uuid, uuid, text, text, public.user_role, text) from public;
revoke all on function public.update_charge(uuid, uuid, text, public.charge_category, date, integer) from public;
revoke all on function public.void_charge(uuid, uuid) from public;

grant execute on function public.assert_admin_actor(uuid) to service_role;
grant execute on function public.record_admin_audit(uuid, text, text, uuid, text, jsonb) to service_role;
grant execute on function public.create_player(uuid, text, text, public.user_role, text) to service_role;
grant execute on function public.update_player(uuid, uuid, text, text, public.user_role, text) to service_role;
grant execute on function public.update_charge(uuid, uuid, text, public.charge_category, date, integer) to service_role;
grant execute on function public.void_charge(uuid, uuid) to service_role;

alter table public.admin_audit_events enable row level security;
alter table public.admin_audit_events force row level security;

drop policy if exists admin_audit_select_admin on public.admin_audit_events;
create policy admin_audit_select_admin
  on public.admin_audit_events
  for select
  to authenticated
  using (public.is_admin());

revoke all on table public.admin_audit_events from public, anon, authenticated;
grant select on table public.admin_audit_events to authenticated;
grant all on table public.admin_audit_events to service_role;
