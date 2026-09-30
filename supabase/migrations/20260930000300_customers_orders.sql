-- ============================================================================
-- Customers, orders, store settings, newsletter.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Customer profiles & addresses
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Profile is created automatically at sign-up. Only `full_name` is copied
-- from user metadata; metadata is user-controlled and is NEVER used for roles.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text,
  full_name   text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  state       text not null,
  postal_code text not null,
  country     text not null default 'US',
  phone       text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id);
create trigger addresses_updated_at before update on public.addresses
  for each row execute function private.set_updated_at();

create table public.wishlist_items (
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Store settings (key/value). `is_public` values are served to the storefront.
-- Unknown business facts stay NULL until the owner provides them.
-- ---------------------------------------------------------------------------

create table public.store_settings (
  key        text primary key check (key ~ '^[a-z_]+$'),
  value      jsonb,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function private.set_updated_at();

insert into public.store_settings (key, value, is_public) values
  ('business_name',   '"ADISAH African Store"', true),
  ('contact_phone',   '"+13014549363"',         true),
  ('contact_email',   null,                     true),
  ('store_address',   null,                     true),  -- {line1, city, state, postal_code}
  ('store_hours',     null,                     true),  -- [{days, opens, closes}]
  ('announcement',    null,                     true),  -- {text, href}
  ('social_links',    null,                     true),  -- {instagram, facebook, ...}
  ('fulfillment',     '{"pickup": false, "local_delivery": false, "shipping": false}', true),
  -- Tax is deliberately unconfigured: US sales tax depends on nexus,
  -- destination and product taxability. Checkout must not go live until set.
  ('tax',             '{"mode": "not_configured"}', false),
  ('order_number_prefix', '"AD"', false);

-- ---------------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------------

create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           extensions.citext not null unique
                  check (email operator(extensions.~) '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  status          text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source          text,
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Orders.
-- Line items are SNAPSHOTS: name, variant, SKU and prices are copied at the
-- time of purchase and never re-derived from the live catalog.
-- Orders and items are created only by trusted server code (service role)
-- after server-side re-pricing; end users can never insert them directly.
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq start 10001;

create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique
                       default ('AD' || nextval('public.order_number_seq')::text),
  customer_id          uuid references auth.users (id) on delete set null,
  email                extensions.citext not null,
  phone                text,
  customer_name        text not null,
  fulfillment_method   text not null check (fulfillment_method in ('pickup', 'local_delivery', 'shipping')),
  shipping_address     jsonb,
  payment_status       text not null default 'unpaid'
                       check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  fulfillment_status   text not null default 'unfulfilled'
                       check (fulfillment_status in ('unfulfilled', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled')),
  currency             text not null default 'usd' check (currency = 'usd'),
  subtotal_cents       int not null check (subtotal_cents >= 0),
  discount_cents       int not null default 0 check (discount_cents >= 0),
  shipping_cents       int not null default 0 check (shipping_cents >= 0),
  tax_cents            int not null default 0 check (tax_cents >= 0),
  total_cents          int not null check (total_cents >= 0),
  tax_details          jsonb,
  payment_provider     text,
  payment_reference    text unique,
  idempotency_key      text unique,
  customer_note        text,
  placed_at            timestamptz not null default now(),
  paid_at              timestamptz,
  cancelled_at         timestamptz,
  updated_at           timestamptz not null default now(),
  constraint total_matches check (total_cents = subtotal_cents - discount_cents + shipping_cents + tax_cents)
);

create index orders_customer_idx on public.orders (customer_id, placed_at desc);
create index orders_placed_idx on public.orders (placed_at desc);
create index orders_status_idx on public.orders (payment_status, fulfillment_status);

create trigger orders_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id                        uuid primary key default gen_random_uuid(),
  order_id                  uuid not null references public.orders (id) on delete cascade,
  -- References are kept for reporting but may become NULL; the snapshot is authoritative.
  product_id                uuid references public.products (id) on delete set null,
  variant_id                uuid references public.product_variants (id) on delete set null,
  product_name              text not null,
  variant_name              text,
  sku                       text,
  regular_unit_price_cents  int not null check (regular_unit_price_cents >= 0),
  unit_price_cents          int not null check (unit_price_cents >= 0),
  quantity                  int not null check (quantity > 0),
  discount_cents            int not null default 0 check (discount_cents >= 0),
  tax_cents                 int not null default 0 check (tax_cents >= 0),
  line_total_cents          int not null check (line_total_cents >= 0),
  created_at                timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_notes (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  author_id   uuid references auth.users (id) on delete set null,
  author_email text,
  body        text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  created_at  timestamptz not null default now()
);

create index order_notes_order_idx on public.order_notes (order_id, created_at);

create table public.order_status_history (
  id                 bigint generated always as identity primary key,
  order_id           uuid not null references public.orders (id) on delete cascade,
  payment_status     text not null,
  fulfillment_status text not null,
  changed_by         uuid references auth.users (id) on delete set null,
  changed_at         timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, changed_at);

-- Staff may only change fulfillment status. Money, items, customer identity
-- and payment status are server/webhook-controlled.
create or replace function private.guard_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_end_user_request() then
    return new;
  end if;
  if (new.id, new.order_number, new.customer_id, new.email, new.phone, new.customer_name,
      new.fulfillment_method, new.shipping_address, new.payment_status, new.currency,
      new.subtotal_cents, new.discount_cents, new.shipping_cents, new.tax_cents, new.total_cents,
      new.tax_details, new.payment_provider, new.payment_reference, new.idempotency_key,
      new.customer_note, new.placed_at, new.paid_at)
     is distinct from
     (old.id, old.order_number, old.customer_id, old.email, old.phone, old.customer_name,
      old.fulfillment_method, old.shipping_address, old.payment_status, old.currency,
      old.subtotal_cents, old.discount_cents, old.shipping_cents, old.tax_cents, old.total_cents,
      old.tax_details, old.payment_provider, old.payment_reference, old.idempotency_key,
      old.customer_note, old.placed_at, old.paid_at) then
    raise exception 'Only fulfillment status can be changed here.' using errcode = '42501';
  end if;
  if new.fulfillment_status = 'cancelled' and old.fulfillment_status <> 'cancelled' then
    -- Cancellation must go through the payment-aware workflow (refunds, stock).
    raise exception 'Use the cancellation workflow to cancel an order.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger orders_guard before update on public.orders
  for each row execute function private.guard_order_update();

create or replace function private.record_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or (new.payment_status, new.fulfillment_status) is distinct from (old.payment_status, old.fulfillment_status) then
    insert into public.order_status_history (order_id, payment_status, fulfillment_status, changed_by)
    values (new.id, new.payment_status, new.fulfillment_status, (select auth.uid()));
  end if;
  return null;
end;
$$;

create trigger orders_status_history after insert or update on public.orders
  for each row execute function private.record_order_status();

create or replace function private.stamp_order_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_end_user_request() then
    new.author_id := (select auth.uid());
    new.author_email := (select auth.jwt()) ->> 'email';
    new.created_at := now();
  end if;
  return new;
end;
$$;

create trigger order_notes_stamp before insert on public.order_notes
  for each row execute function private.stamp_order_note();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles               enable row level security;
alter table public.addresses              enable row level security;
alter table public.wishlist_items         enable row level security;
alter table public.store_settings         enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_notes            enable row level security;
alter table public.order_status_history   enable row level security;

revoke all on public.profiles, public.addresses, public.wishlist_items, public.store_settings,
              public.newsletter_subscribers, public.orders, public.order_items, public.order_notes,
              public.order_status_history
  from anon, authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses, public.wishlist_items to authenticated;
grant select, update on public.store_settings to authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items, public.order_status_history to authenticated;
grant select, insert on public.order_notes to authenticated;

-- Profiles: own row; customer-service staff can read.
create policy "customers read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.has_permission('customers.read')));
create policy "customers update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Addresses & wishlist: strictly own rows.
create policy "customers manage own addresses" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "staff read addresses" on public.addresses for select to authenticated
  using ((select private.has_permission('customers.read')));
create policy "customers manage own wishlist" on public.wishlist_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Settings: staff only (public values are served through storefront_settings()).
create policy "staff read settings" on public.store_settings for select to authenticated
  using ((select private.is_active_staff()));
create policy "settings writers update settings" on public.store_settings for update to authenticated
  using ((select private.has_permission('settings.write')))
  with check ((select private.has_permission('settings.write')));

create policy "staff read newsletter" on public.newsletter_subscribers for select to authenticated
  using ((select private.has_permission('customers.read')));

-- Orders: customers see only their own; staff with orders.read see all.
create policy "customers read own orders" on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.has_permission('orders.read')));
create policy "staff update order fulfillment" on public.orders for update to authenticated
  using ((select private.has_permission('orders.write')))
  with check ((select private.has_permission('orders.write')));

create policy "customers read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = (select auth.uid()) or (select private.has_permission('orders.read')))));

create policy "customers read own order history" on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = (select auth.uid()) or (select private.has_permission('orders.read')))));

-- Internal notes are staff-only.
create policy "staff read order notes" on public.order_notes for select to authenticated
  using ((select private.has_permission('orders.read')));
create policy "staff add order notes" on public.order_notes for insert to authenticated
  with check ((select private.has_permission('orders.write')));
