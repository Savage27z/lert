-- ============================================================================
-- Catalog: categories, brands, products, variants, images, promotions,
-- price history. Money is stored as integer cents (USD).
-- ============================================================================

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  description text,
  image_path  text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Customer-facing name. May be cleaned up independently of the POS name.
  name            text not null check (length(trim(name)) > 0),
  -- Name exactly as it appears in the point-of-sale system. Never rewritten.
  source_name     text,
  description     text,
  ingredients     text,
  usage_notes     text,
  storage_notes   text,
  brand_id        uuid references public.brands (id) on delete set null,
  category_id     uuid references public.categories (id) on delete set null,
  -- draft: being prepared; active: sellable; archived: retired (kept for history).
  status          text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  -- Physical stock and online visibility are separate concepts.
  visibility      text not null default 'hidden' check (visibility in ('published', 'hidden')),
  -- fixed: every variant has a set price. variable: priced at the counter
  -- (e.g. meat/fish by weight) and not purchasable online until a workflow
  -- for it is decided.
  pricing_type    text not null default 'fixed' check (pricing_type in ('fixed', 'variable')),
  variable_price_note text,
  is_featured     boolean not null default false,
  search_keywords text[] not null default '{}',
  -- Internal data-quality flags (never shown to customers).
  needs_review    boolean not null default false,
  review_notes    text,
  search_text     text not null default '',
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id) on delete set null,
  archived_at     timestamptz
);

create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_storefront_idx on public.products (status, visibility);
create index products_search_trgm_idx on public.products using gin (search_text extensions.gin_trgm_ops);

create table public.product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products (id) on delete cascade,
  -- Customer-facing option label, e.g. "4 lbs". "Standard" for single-variant products.
  name                text not null check (length(trim(name)) > 0),
  source_name         text,
  sku                 text,
  -- Null only while a price is unknown (or for variable-priced products);
  -- such variants cannot be purchased.
  regular_price_cents int check (regular_price_cents is null or regular_price_cents > 0),
  price_unit          text,           -- e.g. 'lb' for future price-per-weight items
  track_inventory     boolean not null default false,
  stock_quantity      int check (stock_quantity is null or stock_quantity >= 0),
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  -- Manually maintained status, used when track_inventory is false.
  manual_stock_status text not null default 'in_stock'
                      check (manual_stock_status in ('in_stock', 'low_stock', 'out_of_stock')),
  stock_status        text generated always as (
                        case
                          when track_inventory then
                            case
                              when coalesce(stock_quantity, 0) = 0 then 'out_of_stock'
                              when stock_quantity <= low_stock_threshold then 'low_stock'
                              else 'in_stock'
                            end
                          else manual_stock_status
                        end
                      ) stored,
  online_enabled      boolean not null default true,
  shipping_enabled    boolean not null default false,
  delivery_enabled    boolean not null default false,
  pickup_enabled      boolean not null default true,
  sort_order          int not null default 0,
  needs_review        boolean not null default false,
  review_notes        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id) on delete set null,
  archived_at         timestamptz,
  constraint tracked_inventory_has_quantity check (not track_inventory or stock_quantity is not null)
);

create unique index product_variants_sku_key on public.product_variants (upper(sku)) where sku is not null;
create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text     text not null default '',
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- Promotions never overwrite the regular price. The effective price is the
-- lowest active promotion price for a variant, if below the regular price.
create table public.promotions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  -- weekly_special promotions populate the storefront "Weekly Specials" section.
  kind        text not null default 'sale' check (kind in ('sale', 'weekly_special')),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  constraint promotion_dates check (ends_at is null or ends_at > starts_at)
);

create table public.promotion_items (
  promotion_id     uuid not null references public.promotions (id) on delete cascade,
  variant_id       uuid not null references public.product_variants (id) on delete cascade,
  sale_price_cents int  not null check (sale_price_cents > 0),
  primary key (promotion_id, variant_id)
);

create index promotion_items_variant_idx on public.promotion_items (variant_id);

create table public.price_history (
  id                   bigint generated always as identity primary key,
  variant_id           uuid not null references public.product_variants (id) on delete cascade,
  previous_price_cents int,
  new_price_cents      int,
  changed_by           uuid references auth.users (id) on delete set null,
  changed_by_email     text,
  changed_at           timestamptz not null default now()
);

create index price_history_variant_idx on public.price_history (variant_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- Pricing helpers
-- ---------------------------------------------------------------------------

create or replace function private.active_sale_price_cents(p_variant_id uuid, p_at timestamptz default now())
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select min(pi.sale_price_cents)
  from public.promotion_items pi
  join public.promotions p on p.id = pi.promotion_id
  where pi.variant_id = p_variant_id
    and p.is_active
    and p.starts_at <= p_at
    and (p.ends_at is null or p.ends_at > p_at)
$$;

create or replace function private.effective_price_cents(p_variant_id uuid, p_at timestamptz default now())
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when v.regular_price_cents is null then null
           else least(v.regular_price_cents,
                      coalesce(private.active_sale_price_cents(v.id, p_at), v.regular_price_cents))
         end
  from public.product_variants v
  where v.id = p_variant_id
$$;

-- ---------------------------------------------------------------------------
-- Search document (name, POS name, brand, category, keywords, variants, SKUs)
-- ---------------------------------------------------------------------------

create or replace function private.refresh_product_search(p_product_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products p
  set search_text = private.normalize_search(concat_ws(' ',
        p.name, p.source_name,
        (select b.name from public.brands b where b.id = p.brand_id),
        (select c.name from public.categories c where c.id = p.category_id),
        array_to_string(p.search_keywords, ' '),
        (select string_agg(concat_ws(' ', v.name, v.sku), ' ')
           from public.product_variants v
          where v.product_id = p.id and v.archived_at is null)))
  where p.id = p_product_id
$$;

create or replace function private.products_search_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_product_search(new.id);
  return null;
end;
$$;

create trigger products_search_refresh
  after insert or update of name, source_name, brand_id, category_id, search_keywords on public.products
  for each row execute function private.products_search_trigger();

create or replace function private.variants_search_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_product_search(coalesce(new.product_id, old.product_id));
  return null;
end;
$$;

create trigger variants_search_refresh
  after insert or delete or update of name, sku, archived_at on public.product_variants
  for each row execute function private.variants_search_trigger();

create or replace function private.taxonomy_search_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'brands' then
    perform private.refresh_product_search(p.id) from public.products p where p.brand_id = new.id;
  else
    perform private.refresh_product_search(p.id) from public.products p where p.category_id = new.id;
  end if;
  return null;
end;
$$;

create trigger brands_search_refresh after update of name on public.brands
  for each row execute function private.taxonomy_search_trigger();
create trigger categories_search_refresh after update of name on public.categories
  for each row execute function private.taxonomy_search_trigger();

-- ---------------------------------------------------------------------------
-- Timestamps / actor stamping
-- ---------------------------------------------------------------------------

create trigger categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger brands_updated_at before update on public.brands
  for each row execute function private.set_updated_at();
create trigger promotions_updated_at before update on public.promotions
  for each row execute function private.set_updated_at();

create or replace function private.stamp_product()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, (select auth.uid()));
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  if new.status = 'archived' and (tg_op = 'INSERT' or old.status <> 'archived') then
    new.archived_at := now();
  elsif new.status <> 'archived' then
    new.archived_at := null;
  end if;
  -- search_text is maintained by trigger only.
  if tg_op = 'UPDATE' and private.is_end_user_request() then
    new.search_text := old.search_text;
  end if;
  return new;
end;
$$;

create trigger products_stamp before insert or update on public.products
  for each row execute function private.stamp_product();

-- ---------------------------------------------------------------------------
-- Column-level permission guard for variants.
-- RLS decides *which rows* staff may touch; this decides *which fields*:
--   price fields     -> pricing.write
--   stock fields     -> inventory.write
--   everything else  -> catalog.write
-- ---------------------------------------------------------------------------

create or replace function private.guard_variant_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.product_id := old.product_id;
  end if;
  new.updated_at := now();
  new.updated_by := (select auth.uid());

  if not private.is_end_user_request() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not private.has_permission('catalog.write') then
      raise exception 'Not permitted to create variants.' using errcode = '42501';
    end if;
    if new.regular_price_cents is not null and not private.has_permission('pricing.write') then
      raise exception 'Not permitted to set prices.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.regular_price_cents is distinct from old.regular_price_cents
     and not private.has_permission('pricing.write') then
    raise exception 'Not permitted to change prices.' using errcode = '42501';
  end if;

  if (new.track_inventory, new.stock_quantity, new.low_stock_threshold, new.manual_stock_status)
     is distinct from
     (old.track_inventory, old.stock_quantity, old.low_stock_threshold, old.manual_stock_status)
     and not private.has_permission('inventory.write') then
    raise exception 'Not permitted to change inventory.' using errcode = '42501';
  end if;

  if (new.name, new.source_name, new.sku, new.price_unit, new.online_enabled, new.shipping_enabled,
      new.delivery_enabled, new.pickup_enabled, new.sort_order, new.needs_review, new.review_notes,
      new.archived_at)
     is distinct from
     (old.name, old.source_name, old.sku, old.price_unit, old.online_enabled, old.shipping_enabled,
      old.delivery_enabled, old.pickup_enabled, old.sort_order, old.needs_review, old.review_notes,
      old.archived_at)
     and not private.has_permission('catalog.write') then
    raise exception 'Not permitted to change product details.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger product_variants_guard before insert or update on public.product_variants
  for each row execute function private.guard_variant_write();

-- Price history: every change to a regular price is recorded.
create or replace function private.record_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.regular_price_cents is distinct from old.regular_price_cents then
    insert into public.price_history (variant_id, previous_price_cents, new_price_cents, changed_by, changed_by_email)
    values (new.id,
            case when tg_op = 'UPDATE' then old.regular_price_cents end,
            new.regular_price_cents,
            (select auth.uid()),
            (select auth.jwt()) ->> 'email');
  end if;
  return null;
end;
$$;

create trigger product_variants_price_history after insert or update of regular_price_cents on public.product_variants
  for each row execute function private.record_price_history();

-- Promotion items must be priced below the variant's current regular price.
create or replace function private.validate_promotion_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_regular int;
begin
  select regular_price_cents into v_regular from public.product_variants where id = new.variant_id;
  if v_regular is null then
    raise exception 'This variant has no regular price, so it cannot be put on sale.' using errcode = '22023';
  end if;
  if new.sale_price_cents >= v_regular then
    raise exception 'Sale price must be lower than the regular price.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger promotion_items_validate before insert or update on public.promotion_items
  for each row execute function private.validate_promotion_item();

-- ---------------------------------------------------------------------------
-- RLS — catalog tables are staff-only. The public storefront never touches
-- these tables directly; it calls the storefront_* functions.
-- ---------------------------------------------------------------------------

alter table public.categories       enable row level security;
alter table public.brands           enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.promotions       enable row level security;
alter table public.promotion_items  enable row level security;
alter table public.price_history    enable row level security;

revoke all on public.categories, public.brands, public.products, public.product_variants,
              public.product_images, public.promotions, public.promotion_items, public.price_history
  from anon, authenticated;

grant select, insert, update on public.categories, public.brands, public.products,
                                public.product_variants to authenticated;
grant select, insert, update, delete on public.product_images, public.promotions,
                                        public.promotion_items to authenticated;
grant select on public.price_history to authenticated;

-- Read
create policy "staff read categories" on public.categories for select to authenticated
  using ((select private.has_permission('catalog.read')));
create policy "staff read brands" on public.brands for select to authenticated
  using ((select private.has_permission('catalog.read')));
create policy "staff read products" on public.products for select to authenticated
  using ((select private.has_permission('catalog.read')));
create policy "staff read variants" on public.product_variants for select to authenticated
  using ((select private.has_permission('catalog.read')));
create policy "staff read images" on public.product_images for select to authenticated
  using ((select private.has_permission('catalog.read')));
create policy "staff read promotions" on public.promotions for select to authenticated
  using ((select private.has_permission('catalog.read')));
create policy "staff read promotion items" on public.promotion_items for select to authenticated
  using ((select private.has_permission('catalog.read')));
create policy "staff read price history" on public.price_history for select to authenticated
  using ((select private.has_permission('pricing.write')) or (select private.has_permission('reports.read')));

-- Write: catalog
create policy "catalog writers insert categories" on public.categories for insert to authenticated
  with check ((select private.has_permission('catalog.write')));
create policy "catalog writers update categories" on public.categories for update to authenticated
  using ((select private.has_permission('catalog.write')))
  with check ((select private.has_permission('catalog.write')));
create policy "catalog writers insert brands" on public.brands for insert to authenticated
  with check ((select private.has_permission('catalog.write')));
create policy "catalog writers update brands" on public.brands for update to authenticated
  using ((select private.has_permission('catalog.write')))
  with check ((select private.has_permission('catalog.write')));
create policy "catalog writers insert products" on public.products for insert to authenticated
  with check ((select private.has_permission('catalog.write')));
create policy "catalog writers update products" on public.products for update to authenticated
  using ((select private.has_permission('catalog.write')))
  with check ((select private.has_permission('catalog.write')));
create policy "catalog writers manage images" on public.product_images for all to authenticated
  using ((select private.has_permission('catalog.write')))
  with check ((select private.has_permission('catalog.write')));

-- Variants: row access for any of the three writer permissions; the guard
-- trigger enforces which columns each permission may change.
create policy "catalog writers insert variants" on public.product_variants for insert to authenticated
  with check ((select private.has_permission('catalog.write')));
create policy "staff update variants" on public.product_variants for update to authenticated
  using ((select private.has_permission('catalog.write'))
      or (select private.has_permission('pricing.write'))
      or (select private.has_permission('inventory.write')))
  with check ((select private.has_permission('catalog.write'))
      or (select private.has_permission('pricing.write'))
      or (select private.has_permission('inventory.write')));

-- Promotions
create policy "promotion writers manage promotions" on public.promotions for all to authenticated
  using ((select private.has_permission('promotions.write')))
  with check ((select private.has_permission('promotions.write')));
create policy "promotion writers manage promotion items" on public.promotion_items for all to authenticated
  using ((select private.has_permission('promotions.write')))
  with check ((select private.has_permission('promotions.write')));

-- No DELETE on products/variants/categories/brands: archive instead, so
-- historical orders and reports keep their references.
