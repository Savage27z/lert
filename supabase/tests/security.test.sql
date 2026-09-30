-- ============================================================================
-- Database security & business-rule tests.
-- Runs inside a transaction that is rolled back, against a database that has
-- the migrations + seed applied. Usage: supabase/tests/run.sh
--
-- Each test impersonates a real request by switching to the `anon` or
-- `authenticated` role and setting the JWT claims PostgREST would set.
-- ============================================================================

\set ON_ERROR_STOP on
\pset tuples_only on
begin;

create schema tests;

create function tests.login(p_email text, p_aal text default 'aal1') returns void
language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  perform set_config('request.jwt.claims', json_build_object(
    'sub', v_id, 'role', 'authenticated', 'aal', p_aal, 'email', p_email)::text, false);
  perform set_config('role', 'authenticated', false);
end $$;

create function tests.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  perform set_config('role', 'anon', false);
end $$;

create function tests.uid(p_email text) returns uuid
language sql security definer as $$ select id from auth.users where email = p_email $$;

create function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', false);
  perform set_config('request.jwt.claims', '', false);
end $$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.local',    '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@test.local',  '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stock@test.local',    '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shopper@test.local',  '{"full_name":"Test Shopper","role":"owner"}', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shopper2@test.local', '{}', now(), now());

insert into public.staff_members (user_id, role_key)
select id, case email when 'owner@test.local' then 'owner'
                     when 'manager@test.local' then 'manager'
                     else 'inventory' end
from auth.users where email in ('owner@test.local', 'manager@test.local', 'stock@test.local');

-- An order placed yesterday by shopper: Milo at $14.75.
with o as (
  insert into public.orders (customer_id, email, customer_name, fulfillment_method, payment_status,
                             subtotal_cents, total_cents, idempotency_key)
  select id, email, 'Test Shopper', 'pickup', 'paid', 1475, 1475, 'test-order-1'
  from auth.users where email = 'shopper@test.local'
  returning id
)
insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, sku,
                                regular_unit_price_cents, unit_price_cents, quantity, line_total_cents)
select o.id, p.id, v.id, p.name, v.name, v.sku, v.regular_price_cents, v.regular_price_cents, 1, v.regular_price_cents
from o, public.products p join public.product_variants v on v.product_id = p.id
where p.name = 'Milo';

-- ============================================================================
\echo '--- anonymous visitors'
select tests.anon();
do $$
declare r jsonb;
begin
  begin
    perform 1 from public.products limit 1;
    raise exception 'FAIL: anon read products table';
  exception when insufficient_privilege then null; end;

  begin
    perform 1 from public.orders limit 1;
    raise exception 'FAIL: anon read orders';
  exception when insufficient_privilege then null; end;

  begin
    perform public.staff_context();
    raise exception 'FAIL: anon called staff_context';
  exception when insufficient_privilege then null; end;

  begin
    perform 1 from public.audit_log limit 1;
    raise exception 'FAIL: anon read audit log';
  exception when insufficient_privilege then null; end;

  r := public.storefront_products(p_limit => 60);
  assert (r ->> 'total')::int = 46, 'storefront shows only published products, got ' || (r ->> 'total');
  assert not exists (select 1 from jsonb_array_elements(r -> 'items') i where i ->> 'name' = 'Gari Ijebu'),
    'hidden product leaked to storefront';
  assert not (r::text like '%source_name%' or r::text like '%review_notes%' or r::text like '%stock_quantity%'),
    'internal fields leaked in listing';

  r := public.storefront_product('gino-tomato-paste-210g');
  assert jsonb_array_length(r -> 'variants') = 1, 'variant with unconfirmed title must stay hidden';
  assert public.storefront_product('gari-ijebu') is null, 'hidden product page must not resolve';

  -- search tolerance
  r := public.storefront_products(p_query => 'garri');
  assert (r ->> 'total')::int = 0, 'hidden Gari should not be found';
  r := public.storefront_products(p_query => 'MILO');
  assert r -> 'items' -> 0 ->> 'name' = 'Milo', 'case-insensitive search';
  r := public.storefront_products(p_query => 'paste tomato');
  assert (r ->> 'total')::int >= 1, 'word-order-insensitive search';
  r := public.storefront_products(p_query => 'peek milk');
  assert exists (select 1 from jsonb_array_elements(r -> 'items') i where i ->> 'name' like 'Peak%'), 'typo-tolerant search';
  r := public.storefront_products(p_query => 'ewedu');
  assert r -> 'items' -> 0 ->> 'name' = 'Jute Leaf', 'keyword alias search';

  r := public.subscribe_newsletter('not-an-email');
  assert (r ->> 'ok')::boolean = false, 'newsletter rejects invalid email';
  r := public.subscribe_newsletter('Someone@Example.com');
  assert (r ->> 'ok')::boolean, 'newsletter accepts email';
  r := public.subscribe_newsletter('someone@example.com');
  assert (r ->> 'ok')::boolean, 'duplicate subscribe is indistinguishable';
end $$;
select tests.logout();

\echo '--- cart pricing is authoritative'
do $$
declare
  r jsonb;
  v_milo uuid; v_goat uuid; v_hidden uuid;
begin
  select v.id into v_milo from public.product_variants v join public.products p on p.id = v.product_id where p.name = 'Milo';
  select v.id into v_goat from public.product_variants v join public.products p on p.id = v.product_id where p.name = 'Goat Meat';
  select v.id into v_hidden from public.product_variants v join public.products p on p.id = v.product_id
   where p.name = 'Gino Tomato Paste 210g' and not v.online_enabled;
  perform tests.anon();

  r := public.storefront_price_cart(jsonb_build_array(
        jsonb_build_object('variant_id', v_milo, 'quantity', 2, 'unit_price_cents', 1),  -- forged price ignored
        jsonb_build_object('variant_id', v_goat, 'quantity', 1),
        jsonb_build_object('variant_id', v_hidden, 'quantity', 1),
        jsonb_build_object('variant_id', gen_random_uuid(), 'quantity', 1),
        jsonb_build_object('variant_id', 'nonsense', 'quantity', 1)));
  assert (r ->> 'subtotal_cents')::int = 2950, 'cart subtotal uses DB price, got ' || (r ->> 'subtotal_cents');
  assert (r ->> 'item_count')::int = 2, 'only purchasable items count';
  assert (select count(*) from jsonb_array_elements(r -> 'lines') l where l ->> 'status' = 'unavailable') = 2,
    'sold-out and hidden variants are unavailable';

  r := public.storefront_price_cart(jsonb_build_array(jsonb_build_object('variant_id', v_milo, 'quantity', 5000)));
  assert (r -> 'lines' -> 0 ->> 'quantity')::int = 99, 'quantity is clamped';
  r := public.storefront_price_cart(jsonb_build_array(jsonb_build_object('variant_id', v_milo, 'quantity', -3)));
  assert (r ->> 'subtotal_cents')::int = 0, 'negative quantity cannot produce a credit';
  perform tests.logout();

  -- Tracked stock limits quantity
  update public.product_variants set track_inventory = true, stock_quantity = 3 where id = v_milo;
  perform tests.anon();
  r := public.storefront_price_cart(jsonb_build_array(jsonb_build_object('variant_id', v_milo, 'quantity', 10)));
  assert r -> 'lines' -> 0 ->> 'status' = 'quantity_adjusted' and (r -> 'lines' -> 0 ->> 'quantity')::int = 3,
    'cart cannot exceed tracked stock';
  perform tests.logout();
  update public.product_variants set stock_quantity = 0 where id = v_milo;
  perform tests.anon();
  r := public.storefront_price_cart(jsonb_build_array(jsonb_build_object('variant_id', v_milo, 'quantity', 1)));
  assert r -> 'lines' -> 0 ->> 'status' = 'unavailable', 'zero stock is sold out';
  assert public.storefront_product('milo') -> 'variants' -> 0 ->> 'stock_status' = 'out_of_stock', 'product page shows sold out';
  perform tests.logout();
  update public.product_variants set track_inventory = false, stock_quantity = null where id = v_milo;
end $$;

-- ============================================================================
\echo '--- customers'
select tests.login('shopper@test.local');
do $$
declare n int;
begin
  assert public.staff_context() is null, 'customer has no staff context (even with role in user metadata)';
  assert not private.has_permission('catalog.read'), 'customer has no permissions';

  select count(*) into n from public.products;
  assert n = 0, 'customer cannot read raw catalog tables';

  update public.product_variants set regular_price_cents = 1 where true;
  get diagnostics n = row_count;
  assert n = 0, 'customer cannot change prices';

  begin
    insert into public.staff_members (user_id, role_key) values (auth.uid(), 'owner');
    raise exception 'FAIL: customer self-promoted';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.audit_log (action, entity_type, summary) values ('x', 'x', 'x');
    raise exception 'FAIL: customer wrote audit log';
  exception when insufficient_privilege then null; end;

  select count(*) into n from public.orders;
  assert n = 1, 'customer sees exactly their own order';
  select count(*) into n from public.order_items;
  assert n = 1, 'customer sees their own order items';

  update public.orders set total_cents = 1, subtotal_cents = 1 where true;
  get diagnostics n = row_count;
  assert n = 0, 'customer cannot modify orders';

  select count(*) into n from public.profiles;
  assert n = 1, 'customer sees only own profile';
  assert (select full_name from public.profiles) = 'Test Shopper', 'profile created from sign-up';
end $$;
select tests.logout();

select tests.login('shopper2@test.local');
do $$
begin
  assert (select count(*) from public.orders) = 0, 'other customers cannot see the order';
  assert (select count(*) from public.order_items) = 0, 'other customers cannot see order items';
end $$;
select tests.logout();

-- ============================================================================
\echo '--- MFA is required for staff'
select tests.login('manager@test.local', 'aal1');
do $$
declare n int;
begin
  assert (public.staff_context() ->> 'mfa_required')::boolean, 'aal1 manager must complete MFA';
  assert jsonb_array_length(public.staff_context() -> 'permissions') = 0, 'no permissions before MFA';
  select count(*) into n from public.products;
  assert n = 0, 'aal1 staff cannot read catalog';
  update public.product_variants set regular_price_cents = 1 where true;
  get diagnostics n = row_count;
  assert n = 0, 'aal1 staff cannot change prices';
end $$;
select tests.logout();

-- ============================================================================
\echo '--- manager: price change, history, audit; historical orders untouched'
select tests.login('manager@test.local', 'aal2');
do $$
declare
  v_milo uuid;
  v_hist public.price_history;
  v_audit public.audit_log;
begin
  assert not (public.staff_context() ->> 'mfa_required')::boolean, 'aal2 manager passes MFA';
  assert (select count(*) from public.products) = 51, 'manager sees full catalog incl. hidden';

  select v.id into v_milo from public.product_variants v join public.products p on p.id = v.product_id where p.name = 'Milo';
  update public.product_variants set regular_price_cents = 1549 where id = v_milo;

  select * into v_hist from public.price_history where variant_id = v_milo order by id desc limit 1;
  assert v_hist.previous_price_cents = 1475 and v_hist.new_price_cents = 1549, 'price history recorded';
  assert v_hist.changed_by = auth.uid(), 'price history records actor';

  begin
    insert into public.staff_members (user_id, role_key)
    select id, 'owner' from auth.users where email = 'shopper2@test.local';
    raise exception 'FAIL: manager granted owner';
  exception when insufficient_privilege then null; end;

  begin
    update public.orders set total_cents = 0, subtotal_cents = 0 where true;
    raise exception 'FAIL: manager changed order totals';
  exception when insufficient_privilege then null; end;

  update public.orders set fulfillment_status = 'ready_for_pickup' where true;
  assert (select fulfillment_status from public.orders limit 1) = 'ready_for_pickup', 'manager updates fulfillment';

  begin
    update public.orders set fulfillment_status = 'cancelled' where true;
    raise exception 'FAIL: bypassed cancellation workflow';
  exception when insufficient_privilege then null; end;

  begin
    update public.store_settings set value = '"x"' where key = 'contact_phone';
    if found then raise exception 'FAIL: manager changed settings'; end if;
  end;
end $$;
select tests.logout();

do $$
declare v_audit public.audit_log;
begin
  select * into v_audit from public.audit_log where action = 'variant.price_changed' order by id desc limit 1;
  assert v_audit.summary = 'Changed Milo — 400 g price $14.75 → $15.49', 'audit summary: ' || coalesce(v_audit.summary, 'none');
  assert v_audit.actor_email = 'manager@test.local' and v_audit.actor_role = 'manager', 'audit actor';

  assert (select unit_price_cents from public.order_items where product_name = 'Milo') = 1475,
    'historical order keeps purchase price';
  assert (select public.storefront_product('milo') -> 'variants' -> 0 ->> 'price_cents')::int = 1549,
    'storefront shows new price immediately';
end $$;

-- ============================================================================
\echo '--- inventory staff: stock yes, price no'
select tests.login('stock@test.local', 'aal2');
do $$
declare v_beans uuid;
begin
  select v.id into v_beans from public.product_variants v join public.products p on p.id = v.product_id
   where p.name = 'Honey Beans' and v.name = '4 lbs';

  update public.product_variants set track_inventory = true, stock_quantity = 10 where id = v_beans;
  assert (select stock_status from public.product_variants where id = v_beans) = 'in_stock', 'stock updated';

  update public.product_variants set stock_quantity = 2 where id = v_beans;
  assert (select stock_status from public.product_variants where id = v_beans) = 'low_stock', 'low stock derived';

  begin
    update public.product_variants set regular_price_cents = 100 where id = v_beans;
    raise exception 'FAIL: inventory staff changed price';
  exception when insufficient_privilege then null; end;

  begin
    update public.product_variants set online_enabled = false where id = v_beans;
    raise exception 'FAIL: inventory staff changed product details';
  exception when insufficient_privilege then null; end;

  update public.products set visibility = 'hidden' where name = 'Honey Beans';
  assert not found, 'inventory staff cannot unpublish products';

  begin
    update public.product_variants set stock_quantity = -1 where id = v_beans;
    raise exception 'FAIL: negative stock';
  exception when check_violation then null; end;

  assert (select count(*) from public.audit_log) = 0, 'inventory staff cannot read audit log';
end $$;
select tests.logout();

-- ============================================================================
\echo '--- promotions keep regular price'
do $$
declare
  v_beans10 uuid;
  v_promo uuid;
  r jsonb;
begin
  select v.id into v_beans10 from public.product_variants v join public.products p on p.id = v.product_id
   where p.name = 'Honey Beans' and v.name = '10 lbs';
  insert into public.promotions (name, kind, starts_at, ends_at)
  values ('Weekly specials', 'weekly_special', now() - interval '1 day', now() + interval '6 days')
  returning id into v_promo;

  begin
    insert into public.promotion_items values (v_promo, v_beans10, 2299);
    raise exception 'FAIL: sale price equal to regular accepted';
  exception when invalid_parameter_value then null; end;

  insert into public.promotion_items values (v_promo, v_beans10, 1999);
  perform tests.anon();
  r := public.storefront_product('honey-beans');
  assert (select (x ->> 'price_cents')::int from jsonb_array_elements(r -> 'variants') x where x ->> 'name' = '10 lbs') = 1999, 'sale price active';
  assert (select (x ->> 'regular_price_cents')::int from jsonb_array_elements(r -> 'variants') x where x ->> 'name' = '10 lbs') = 2299, 'regular price kept';
  assert (select (x ->> 'price_cents')::int from jsonb_array_elements(r -> 'variants') x where x ->> 'name' = '4 lbs') = 884, 'other variant unaffected';
  assert jsonb_array_length(public.storefront_home() -> 'specials') = 1, 'weekly specials populated';
  perform tests.logout();

  update public.promotions set ends_at = now() - interval '1 minute', starts_at = now() - interval '2 days' where id = v_promo;
  perform tests.anon();
  r := public.storefront_product('honey-beans');
  assert (select (x ->> 'price_cents')::int from jsonb_array_elements(r -> 'variants') x where x ->> 'name' = '10 lbs') = 2299, 'expired sale reverts';
  perform tests.logout();
end $$;

-- ============================================================================
\echo '--- owner: staff management guard rails'
select tests.login('owner@test.local', 'aal2');
do $$
begin
  begin
    update public.staff_members set role_key = 'inventory' where user_id = auth.uid();
    raise exception 'FAIL: owner edited own membership';
  exception when insufficient_privilege then null; end;

  update public.staff_members set is_active = false
   where user_id = tests.uid('manager@test.local');
  assert (select deactivated_at is not null from public.staff_members
           where user_id = tests.uid('manager@test.local')), 'deactivation stamped';

  update public.store_settings set value = '{"text": "Now open"}' where key = 'announcement';
  assert found, 'owner changes settings';
end $$;
select tests.logout();

select tests.login('manager@test.local', 'aal2');
do $$
begin
  assert public.staff_context() is null, 'deactivated staff lose access immediately';
  assert (select count(*) from public.products) = 0, 'deactivated staff cannot read catalog';
end $$;
select tests.logout();

\echo 'ALL DATABASE TESTS PASSED'
rollback;
