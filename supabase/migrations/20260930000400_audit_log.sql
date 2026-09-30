-- ============================================================================
-- Audit log. Written ONLY by database triggers, so every change made through
-- any path (operations UI, API, SQL console) is recorded. Append-only.
-- ============================================================================

create table public.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  actor_role  text,
  action      text not null,          -- e.g. variant.price_changed
  entity_type text not null,          -- table name
  entity_id   text,
  summary     text not null,
  changes     jsonb                   -- {column: {from, to}}
);

create index audit_log_occurred_idx on public.audit_log (occurred_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, occurred_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy "auditors read activity" on public.audit_log for select to authenticated
  using ((select private.has_permission('audit.read')));

-- jsonb diff of changed columns, ignoring bookkeeping columns.
create or replace function private.row_diff(p_old jsonb, p_new jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(k, jsonb_build_object('from', p_old -> k, 'to', p_new -> k)), '{}'::jsonb)
  from jsonb_object_keys(coalesce(p_new, p_old)) as k
  where k not in ('updated_at', 'updated_by', 'search_text', 'created_at', 'created_by', 'stock_status')
    and (p_old -> k) is distinct from (p_new -> k)
$$;

create or replace function private.write_audit(
  p_action text, p_entity_type text, p_entity_id text, p_summary text, p_changes jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_email, actor_role, action, entity_type, entity_id, summary, changes)
  values (
    (select auth.uid()),
    coalesce((select auth.jwt()) ->> 'email', case when (select auth.uid()) is null then 'system' end),
    (select sm.role_key from public.staff_members sm where sm.user_id = (select auth.uid())),
    p_action, p_entity_type, p_entity_id, p_summary, nullif(p_changes, '{}'::jsonb))
$$;

create or replace function private.fmt_cents(p_cents int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_cents is null then '—' else '$' || to_char(p_cents / 100.0, 'FM999999990.00') end
$$;

create or replace function private.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old     jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new     jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_changes jsonb := private.row_diff(v_old, v_new);
  v_label   text;
  v_action  text;
  v_summary text;
begin
  if tg_op = 'UPDATE' and v_changes = '{}'::jsonb then
    return null;
  end if;

  if tg_table_name = 'product_variants' then
    select p.name || ' — ' || (v_row ->> 'name') into v_label
    from public.products p where p.id = (v_row ->> 'product_id')::uuid;
  elsif tg_table_name = 'promotion_items' then
    select coalesce(pr.name, 'Promotion') || ': ' || p.name || ' — ' || v.name into v_label
    from public.product_variants v
    join public.products p on p.id = v.product_id
    left join public.promotions pr on pr.id = (v_row ->> 'promotion_id')::uuid
    where v.id = (v_row ->> 'variant_id')::uuid;
  elsif tg_table_name = 'orders' then
    v_label := 'Order ' || (v_row ->> 'order_number');
  elsif tg_table_name = 'staff_members' then
    select coalesce(u.email, v_row ->> 'user_id') into v_label from auth.users u where u.id = (v_row ->> 'user_id')::uuid;
  elsif tg_table_name = 'store_settings' then
    v_label := 'Setting ' || (v_row ->> 'key');
  else
    v_label := coalesce(v_row ->> 'name', v_row ->> 'id');
  end if;

  v_action := tg_table_name || '.' || lower(tg_op);
  v_summary := case tg_op when 'INSERT' then 'Created ' when 'UPDATE' then 'Updated ' else 'Removed ' end
               || coalesce(v_label, tg_table_name);

  if tg_table_name = 'product_variants' and tg_op = 'UPDATE' then
    if v_changes ? 'regular_price_cents' then
      v_action := 'variant.price_changed';
      v_summary := 'Changed ' || v_label || ' price ' ||
        private.fmt_cents((v_old ->> 'regular_price_cents')::int) || ' → ' ||
        private.fmt_cents((v_new ->> 'regular_price_cents')::int);
    elsif v_changes ?| array['stock_quantity', 'manual_stock_status', 'track_inventory'] then
      v_action := 'variant.inventory_changed';
      v_summary := 'Updated inventory for ' || v_label || ': ' ||
        coalesce(v_new ->> 'stock_quantity', '—') || ' on hand, ' || replace(v_new ->> 'stock_status', '_', ' ');
    elsif v_changes ? 'online_enabled' then
      v_action := 'variant.online_changed';
      v_summary := case when (v_new ->> 'online_enabled')::boolean then 'Enabled ' else 'Disabled ' end
        || v_label || ' for online sale';
    end if;
  elsif tg_table_name = 'products' and tg_op = 'UPDATE' then
    if v_changes ? 'status' then
      v_action := 'product.status_changed';
      v_summary := 'Changed ' || v_label || ' status to ' || (v_new ->> 'status');
    elsif v_changes ? 'visibility' then
      v_action := 'product.visibility_changed';
      v_summary := case when v_new ->> 'visibility' = 'published' then 'Published ' else 'Hid ' end
        || v_label || case when v_new ->> 'visibility' = 'published' then ' online' else ' from the website' end;
    end if;
  elsif tg_table_name = 'orders' and tg_op = 'UPDATE' and v_changes ? 'fulfillment_status' then
    v_action := 'order.fulfillment_changed';
    v_summary := v_label || ' marked ' || replace(v_new ->> 'fulfillment_status', '_', ' ');
  elsif tg_table_name = 'staff_members' and tg_op = 'UPDATE' then
    if v_changes ? 'role_key' then
      v_action := 'staff.role_changed';
      v_summary := 'Changed role for ' || v_label || ' to ' || (v_new ->> 'role_key');
    elsif v_changes ? 'is_active' then
      v_action := case when (v_new ->> 'is_active')::boolean then 'staff.reactivated' else 'staff.deactivated' end;
      v_summary := case when (v_new ->> 'is_active')::boolean then 'Reactivated ' else 'Deactivated ' end || v_label;
    end if;
  end if;

  perform private.write_audit(v_action, tg_table_name, coalesce(v_row ->> 'id', v_row ->> 'user_id', v_row ->> 'key'),
                              v_summary, case when tg_op = 'UPDATE' then v_changes end);
  return null;
end;
$$;

create trigger audit_products after insert or update on public.products
  for each row execute function private.audit_trigger();
create trigger audit_product_variants after insert or update on public.product_variants
  for each row execute function private.audit_trigger();
create trigger audit_categories after insert or update on public.categories
  for each row execute function private.audit_trigger();
create trigger audit_brands after insert or update on public.brands
  for each row execute function private.audit_trigger();
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function private.audit_trigger();
create trigger audit_promotion_items after insert or update or delete on public.promotion_items
  for each row execute function private.audit_trigger();
create trigger audit_product_images after insert or delete on public.product_images
  for each row execute function private.audit_trigger();
create trigger audit_orders after update on public.orders
  for each row execute function private.audit_trigger();
create trigger audit_staff_members after insert or update on public.staff_members
  for each row execute function private.audit_trigger();
create trigger audit_store_settings after update on public.store_settings
  for each row execute function private.audit_trigger();
