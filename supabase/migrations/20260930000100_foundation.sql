-- ============================================================================
-- ADISAH African Store — foundation
-- Extensions, private helper schema, staff roles & permissions.
--
-- Security model (summary — see docs/ARCHITECTURE.md):
--   * Every table has RLS enabled. Nothing is readable by `anon` directly;
--     the public storefront reads through narrow SECURITY DEFINER functions
--     (see 20260930000500_storefront_api.sql).
--   * Staff privileges come from rows in public.staff_members, never from
--     client-editable metadata. Permission checks run inside the database
--     (private.has_permission) so the UI can never be the only gate.
--   * Privileged roles require an MFA-verified session (JWT aal = 'aal2').
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;

-- Helpers live in `private`, which is NOT exposed through the Data API.
-- Roles still need USAGE so RLS policies can call the helpers.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Immutable wrapper so unaccent can be used in generated columns / indexes.
create or replace function private.normalize_search(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')))
$$;

create or replace function private.slugify(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(private.normalize_search(p_text), '&', ' and ', 'g'),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- True when the current request comes from an end-user JWT (anon / authenticated)
-- rather than a trusted server context (service_role, migrations, seeds).
create or replace function private.is_end_user_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated')
$$;

-- ---------------------------------------------------------------------------
-- Staff roles & permissions
-- ---------------------------------------------------------------------------

create table public.staff_roles (
  key          text primary key check (key ~ '^[a-z_]+$'),
  name         text not null,
  description  text,
  -- Higher rank = more privileged. Staff may only assign roles ranked below
  -- their own (owners may assign any role). Prevents privilege escalation.
  rank         int  not null unique check (rank > 0),
  requires_mfa boolean not null default true
);

create table public.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null
);

create table public.role_permissions (
  role_key       text not null references public.staff_roles (key) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_key, permission_key)
);

create table public.staff_members (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  role_key       text not null references public.staff_roles (key),
  display_name   text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now(),
  deactivated_at timestamptz
);

create trigger staff_members_updated_at
  before update on public.staff_members
  for each row execute function private.set_updated_at();

insert into public.permissions (key, description) values
  ('catalog.read',     'View the full catalog, including hidden and archived products'),
  ('catalog.write',    'Create and edit products, variants, categories, brands and images'),
  ('pricing.write',    'Change regular prices'),
  ('inventory.write',  'Change stock quantities and stock status'),
  ('promotions.write', 'Create and edit promotions and sale prices'),
  ('orders.read',      'View all orders'),
  ('orders.write',     'Update order fulfillment status and add internal notes'),
  ('customers.read',   'View customer accounts and newsletter subscribers'),
  ('reports.read',     'View sales and inventory reports'),
  ('audit.read',       'View the activity log'),
  ('settings.write',   'Change store settings'),
  ('staff.manage',     'Invite, change and deactivate staff members');

insert into public.staff_roles (key, name, description, rank, requires_mfa) values
  ('inventory', 'Inventory Staff', 'Updates stock levels and availability', 10, true),
  ('manager',   'Manager',         'Runs day-to-day catalog, pricing, promotions and orders', 20, true),
  ('admin',     'Administrator',   'Broad operational control, customers and activity log', 30, true),
  ('owner',     'Owner',           'Full control including staff, roles and store settings', 40, true);

insert into public.role_permissions (role_key, permission_key)
select r.role_key, r.permission_key
from (values
  ('inventory', 'catalog.read'), ('inventory', 'inventory.write'),

  ('manager', 'catalog.read'), ('manager', 'catalog.write'), ('manager', 'pricing.write'),
  ('manager', 'inventory.write'), ('manager', 'promotions.write'), ('manager', 'orders.read'),
  ('manager', 'orders.write'), ('manager', 'reports.read'),

  ('admin', 'catalog.read'), ('admin', 'catalog.write'), ('admin', 'pricing.write'),
  ('admin', 'inventory.write'), ('admin', 'promotions.write'), ('admin', 'orders.read'),
  ('admin', 'orders.write'), ('admin', 'reports.read'), ('admin', 'customers.read'),
  ('admin', 'audit.read')
) as r (role_key, permission_key)
union all
select 'owner', p.key from public.permissions p;

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER so they can read staff tables
-- regardless of the caller's RLS visibility; they only ever answer questions
-- about the *current* user).
-- ---------------------------------------------------------------------------

create or replace function private.current_mfa_level()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1')
$$;

create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members sm
    join public.staff_roles r       on r.key = sm.role_key
    join public.role_permissions rp on rp.role_key = sm.role_key
    where sm.user_id = (select auth.uid())
      and sm.is_active
      and rp.permission_key = p_permission
      and (not r.requires_mfa or private.current_mfa_level() = 'aal2')
  )
$$;

create or replace function private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members sm
    join public.staff_roles r on r.key = sm.role_key
    where sm.user_id = (select auth.uid())
      and sm.is_active
      and (not r.requires_mfa or private.current_mfa_level() = 'aal2')
  )
$$;

create or replace function private.current_staff_rank()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select r.rank
  from public.staff_members sm
  join public.staff_roles r on r.key = sm.role_key
  where sm.user_id = (select auth.uid()) and sm.is_active
$$;

revoke all on function private.has_permission(text) from public;
revoke all on function private.is_active_staff() from public;
revoke all on function private.current_staff_rank() from public;
grant execute on function private.has_permission(text) to anon, authenticated, service_role;
grant execute on function private.is_active_staff() to anon, authenticated, service_role;
grant execute on function private.current_staff_rank() to authenticated, service_role;

-- Exposed RPC: lets the operations app learn the *caller's own* staff context.
-- Returns NULL for anyone who is not an active staff member, so it reveals
-- nothing to customers. `mfa_required` tells the app to run the MFA step.
create or replace function public.staff_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id',      sm.user_id,
    'display_name', sm.display_name,
    'role',         r.key,
    'role_name',    r.name,
    'mfa_required', r.requires_mfa and private.current_mfa_level() <> 'aal2',
    'permissions',  case
                      when r.requires_mfa and private.current_mfa_level() <> 'aal2' then '[]'::jsonb
                      else coalesce((select jsonb_agg(rp.permission_key order by rp.permission_key)
                                     from public.role_permissions rp
                                     where rp.role_key = r.key), '[]'::jsonb)
                    end
  )
  from public.staff_members sm
  join public.staff_roles r on r.key = sm.role_key
  where sm.user_id = (select auth.uid()) and sm.is_active
$$;

revoke all on function public.staff_context() from public, anon;
grant execute on function public.staff_context() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS for staff tables
-- ---------------------------------------------------------------------------

alter table public.staff_roles      enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_members    enable row level security;

revoke all on public.staff_roles, public.permissions, public.role_permissions, public.staff_members
  from anon, authenticated;
grant select on public.staff_roles, public.permissions, public.role_permissions to authenticated;
grant select, insert, update on public.staff_members to authenticated;

create policy "staff can read role definitions" on public.staff_roles
  for select to authenticated using ((select private.is_active_staff()));
create policy "staff can read permission definitions" on public.permissions
  for select to authenticated using ((select private.is_active_staff()));
create policy "staff can read role permissions" on public.role_permissions
  for select to authenticated using ((select private.is_active_staff()));

create policy "staff managers can read staff" on public.staff_members
  for select to authenticated
  using ((select private.has_permission('staff.manage')) or user_id = (select auth.uid()));

create policy "staff managers can add staff" on public.staff_members
  for insert to authenticated
  with check ((select private.has_permission('staff.manage')));

create policy "staff managers can change staff" on public.staff_members
  for update to authenticated
  using ((select private.has_permission('staff.manage')))
  with check ((select private.has_permission('staff.manage')));

-- No DELETE policy: staff are deactivated, never deleted, to keep audit history.

-- Escalation guard: nobody edits their own membership, and nobody grants or
-- edits a role at or above their own rank unless they are an owner.
-- SECURITY INVOKER on purpose: private.is_end_user_request() inspects
-- current_user, which a SECURITY DEFINER function would mask.
create or replace function private.guard_staff_members()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor_rank  int;
  v_target_rank int;
  v_old_rank    int;
  v_owner_rank  int;
begin
  if not private.is_end_user_request() then
    return new;
  end if;

  if new.user_id = (select auth.uid()) then
    raise exception 'You cannot change your own staff access.' using errcode = '42501';
  end if;

  v_actor_rank := private.current_staff_rank();
  select rank into v_owner_rank from public.staff_roles where key = 'owner';
  select rank into v_target_rank from public.staff_roles where key = new.role_key;

  if tg_op = 'UPDATE' then
    select rank into v_old_rank from public.staff_roles where key = old.role_key;
  end if;

  if v_actor_rank is distinct from v_owner_rank
     and (v_target_rank >= v_actor_rank or coalesce(v_old_rank, 0) >= v_actor_rank) then
    raise exception 'You cannot assign or modify a role at or above your own.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  if new.is_active is false and (tg_op = 'INSERT' or old.is_active) then
    new.deactivated_at := now();
  elsif new.is_active then
    new.deactivated_at := null;
  end if;

  return new;
end;
$$;

create trigger staff_members_guard
  before insert or update on public.staff_members
  for each row execute function private.guard_staff_members();
