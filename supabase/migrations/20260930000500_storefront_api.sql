-- ============================================================================
-- Public storefront API.
-- The only database surface available to anonymous visitors. Each function
-- returns customer-safe fields only (no POS names, internal notes, exact
-- stock counts, or unpublished products).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Internal building blocks
-- ---------------------------------------------------------------------------

-- Aggregated, customer-safe summary of a product's visible variants.
create or replace function private.product_card(p_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select pv.id, pv.name, pv.stock_status, pv.sort_order,
           pv.regular_price_cents as regular,
           private.effective_price_cents(pv.id) as price,
           (p.pricing_type = 'fixed' and pv.regular_price_cents is not null
             and pv.stock_status <> 'out_of_stock') as purchasable
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.product_id = p_product_id and pv.online_enabled and pv.archived_at is null
  ),
  agg as (
    select count(*) as variant_count,
           min(price) filter (where price is not null) as price_min,
           max(price) filter (where price is not null) as price_max,
           bool_or(price < regular) as on_sale,
           bool_or(purchasable) as any_purchasable,
           bool_or(stock_status = 'in_stock') as any_in_stock,
           bool_or(stock_status = 'low_stock') as any_low
    from v
  ),
  cheapest as (
    select regular from v where price is not null order by price, sort_order limit 1
  )
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'name', p.name,
    'brand', b.name,
    'category', case when c.id is not null and c.is_active
                     then jsonb_build_object('slug', c.slug, 'name', c.name) end,
    'image', (select jsonb_build_object('path', i.storage_path, 'alt', i.alt_text)
                from public.product_images i where i.product_id = p.id
                order by i.sort_order, i.created_at limit 1),
    'pricing_type', p.pricing_type,
    'variable_price_note', p.variable_price_note,
    'price_min_cents', agg.price_min,
    'price_max_cents', agg.price_max,
    'regular_price_cents', (select regular from cheapest),
    'on_sale', coalesce(agg.on_sale, false),
    'variant_count', agg.variant_count,
    'purchasable', coalesce(agg.any_purchasable, false),
    'stock_status', case
                      when agg.any_in_stock then 'in_stock'
                      when agg.any_low then 'low_stock'
                      else 'out_of_stock'
                    end,
    -- Lets product cards add straight to cart when there is nothing to choose.
    'quick_add_variant_id', case when agg.variant_count = 1 and agg.any_purchasable
                                 then (select v.id from v limit 1) end,
    'quick_add_variant_name', case when agg.variant_count = 1
                                   then (select v.name from v limit 1) end
  )
  from public.products p
  cross join agg
  left join public.brands b on b.id = p.brand_id
  left join public.categories c on c.id = p.category_id
  where p.id = p_product_id
$$;

-- ---------------------------------------------------------------------------
-- Public functions
-- ---------------------------------------------------------------------------

create or replace function public.storefront_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(s.key, s.value), '{}'::jsonb)
  from public.store_settings s
  where s.is_public
$$;

create or replace function public.storefront_categories()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x.sort_order, x.name), '[]'::jsonb)
  from (
    select c.slug, c.name, c.description, c.image_path, c.sort_order,
           count(p.id) as product_count
    from public.categories c
    join public.products p on p.category_id = c.id
    where c.is_active and p.status = 'active' and p.visibility = 'published'
    group by c.id
  ) x
$$;

-- Catalog listing, search and filtering.
--   p_sort: featured | newest | price_asc | price_desc | name | popular | relevance
create or replace function public.storefront_products(
  p_query     text    default null,
  p_category  text    default null,
  p_brands    text[]  default null,
  p_in_stock  boolean default false,
  p_on_sale   boolean default false,
  p_featured  boolean default false,
  p_sort      text    default 'featured',
  p_limit     int     default 24,
  p_offset    int     default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q      text := nullif(private.normalize_search(trim(left(coalesce(p_query, ''), 80))), '');
  v_limit  int  := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_offset int  := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  with base as (
    select p.id, p.name, p.slug, p.is_featured, p.created_at, p.category_id, p.brand_id,
           case
             when v_q is null then 0
             when private.normalize_search(p.name) = v_q then 3
             when private.normalize_search(p.name) like v_q || '%' then 2
             when p.search_text like '%' || v_q || '%' then 1
             else extensions.word_similarity(v_q, p.search_text)
           end as relevance
    from public.products p
    left join public.categories c on c.id = p.category_id
    where p.status = 'active' and p.visibility = 'published'
      and exists (select 1 from public.product_variants pv
                  where pv.product_id = p.id and pv.online_enabled and pv.archived_at is null)
      and (p_category is null or (c.slug = p_category and c.is_active))
      and (v_q is null
           or p.search_text like '%' || v_q || '%'
           or extensions.word_similarity(v_q, p.search_text) >= 0.4
           -- every word matches somewhere (handles "paste tomato", "beans honey")
           or not exists (select 1 from unnest(string_to_array(v_q, ' ')) w
                          where w <> '' and p.search_text not like '%' || w || '%'))
  ),
  facet_brands as (
    select coalesce(jsonb_agg(jsonb_build_object('slug', b.slug, 'name', b.name, 'count', x.n)
                              order by b.name), '[]'::jsonb) as j
    from (select brand_id, count(*) n from base where brand_id is not null group by brand_id) x
    join public.brands b on b.id = x.brand_id
  ),
  cards as (
    select base.*, private.product_card(base.id) as card,
           (select coalesce(sum(oi.quantity), 0) from public.order_items oi
              join public.orders o on o.id = oi.order_id
             where oi.product_id = base.id and o.payment_status = 'paid'
               and o.placed_at > now() - interval '90 days') as units_sold
    from base
    left join public.brands b on b.id = base.brand_id
    where (p_brands is null or cardinality(p_brands) = 0 or b.slug = any (p_brands))
      and (not coalesce(p_featured, false) or base.is_featured)
  ),
  filtered as (
    select * from cards
    where (not coalesce(p_in_stock, false) or (card ->> 'stock_status') <> 'out_of_stock')
      and (not coalesce(p_on_sale, false) or (card ->> 'on_sale')::boolean)
  ),
  ordered as (
    select *, row_number() over (order by
        case when p_sort = 'relevance' or (p_sort = 'featured' and v_q is not null) then relevance end desc nulls last,
        case when p_sort = 'popular' then units_sold end desc nulls last,
        case when p_sort in ('featured', 'popular') then is_featured end desc nulls last,
        case when p_sort = 'newest' then created_at end desc nulls last,
        case when p_sort = 'price_asc' then (card ->> 'price_min_cents')::int end asc nulls last,
        case when p_sort = 'price_desc' then (card ->> 'price_max_cents')::int end desc nulls last,
        -- purchasable items before sold-out / variable-price items
        (card ->> 'purchasable')::boolean desc,
        name asc) as rn,
        count(*) over () as total
    from filtered
  )
  select jsonb_build_object(
    'total', coalesce(max(total), 0),
    'limit', v_limit,
    'offset', v_offset,
    'items', coalesce(jsonb_agg(card order by rn) filter (where rn > v_offset and rn <= v_offset + v_limit), '[]'::jsonb),
    'facets', jsonb_build_object('brands', (select j from facet_brands))
  )
  into v_result
  from ordered;

  return v_result;
end;
$$;

create or replace function public.storefront_home()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with sales as (
    select oi.product_id, sum(oi.quantity) as units
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.payment_status = 'paid' and o.placed_at > now() - interval '90 days'
      and oi.product_id is not null
    group by oi.product_id
  ),
  visible as (
    select p.* from public.products p
    where p.status = 'active' and p.visibility = 'published'
      and exists (select 1 from public.product_variants pv
                  where pv.product_id = p.id and pv.online_enabled and pv.archived_at is null)
  ),
  popular as (
    select v.id from visible v join sales s on s.product_id = v.id
    order by s.units desc, v.name limit 10
  ),
  featured as (
    select v.id from visible v where v.is_featured order by v.name limit 10
  ),
  specials as (
    select distinct v.id, v.name
    from visible v
    join public.product_variants pv on pv.product_id = v.id and pv.online_enabled and pv.archived_at is null
    join public.promotion_items pi on pi.variant_id = pv.id
    join public.promotions pr on pr.id = pi.promotion_id
    where pr.is_active and pr.kind = 'weekly_special'
      and pr.starts_at <= now() and (pr.ends_at is null or pr.ends_at > now())
      and pi.sale_price_cents < pv.regular_price_cents
  )
  select jsonb_build_object(
    -- Only call it "popular" when real paid-order data exists.
    'popular_source', case when exists (select 1 from popular) then 'sales' else 'featured' end,
    'popular', coalesce(
       (select jsonb_agg(private.product_card(id)) from popular),
       (select jsonb_agg(private.product_card(id)) from featured),
       '[]'::jsonb),
    'featured', coalesce((select jsonb_agg(private.product_card(id)) from featured), '[]'::jsonb),
    'specials', coalesce((select jsonb_agg(private.product_card(id) order by name) from (select * from specials limit 12) s), '[]'::jsonb),
    'specials_ends_at', (select min(pr.ends_at) from public.promotions pr
                          where pr.is_active and pr.kind = 'weekly_special'
                            and pr.starts_at <= now() and pr.ends_at > now()),
    'categories', public.storefront_categories()
  )
$$;

create or replace function public.storefront_product(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'name', p.name,
    'description', p.description,
    'ingredients', p.ingredients,
    'usage_notes', p.usage_notes,
    'storage_notes', p.storage_notes,
    'brand', b.name,
    'brand_slug', b.slug,
    'category', case when c.is_active then jsonb_build_object('slug', c.slug, 'name', c.name) end,
    'pricing_type', p.pricing_type,
    'variable_price_note', p.variable_price_note,
    'updated_at', p.updated_at,
    'images', coalesce((select jsonb_agg(jsonb_build_object('path', i.storage_path, 'alt', i.alt_text)
                                         order by i.sort_order, i.created_at)
                          from public.product_images i where i.product_id = p.id), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id,
               'name', v.name,
               'price_cents', private.effective_price_cents(v.id),
               'regular_price_cents', v.regular_price_cents,
               'on_sale', private.effective_price_cents(v.id) < v.regular_price_cents,
               'sale_ends_at', (select min(pr.ends_at) from public.promotion_items pi
                                  join public.promotions pr on pr.id = pi.promotion_id
                                 where pi.variant_id = v.id and pr.is_active and pr.starts_at <= now()
                                   and (pr.ends_at is null or pr.ends_at > now())
                                   and pi.sale_price_cents = private.effective_price_cents(v.id)),
               'stock_status', v.stock_status,
               'purchasable', p.pricing_type = 'fixed' and v.regular_price_cents is not null
                              and v.stock_status <> 'out_of_stock',
               'fulfillment', jsonb_build_object('pickup', v.pickup_enabled,
                                                 'local_delivery', v.delivery_enabled,
                                                 'shipping', v.shipping_enabled))
             order by v.sort_order, v.regular_price_cents nulls last, v.name)
      from public.product_variants v
      where v.product_id = p.id and v.online_enabled and v.archived_at is null), '[]'::jsonb),
    'related', coalesce((
      select jsonb_agg(private.product_card(r.id))
      from (select r.id from public.products r
             where r.category_id = p.category_id and r.id <> p.id
               and r.status = 'active' and r.visibility = 'published'
               and exists (select 1 from public.product_variants rv
                           where rv.product_id = r.id and rv.online_enabled and rv.archived_at is null)
             order by r.is_featured desc, r.name limit 6) r), '[]'::jsonb)
  )
  from public.products p
  left join public.brands b on b.id = p.brand_id
  left join public.categories c on c.id = p.category_id
  where p.slug = p_slug and p.status = 'active' and p.visibility = 'published'
$$;

-- Authoritative cart pricing. The browser only ever sends variant ids and
-- quantities; names, prices and availability always come from here.
create or replace function public.storefront_price_cart(p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('lines', '[]'::jsonb, 'subtotal_cents', 0, 'item_count', 0);
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many cart lines.' using errcode = '22023';
  end if;

  with req as (
    select (e ->> 'variant_id') as variant_id_text,
           least(greatest(coalesce((e ->> 'quantity')::int, 0), 0), 99) as quantity,
           ord
    from jsonb_array_elements(p_items) with ordinality as t(e, ord)
    where (e ->> 'variant_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  dedup as (
    select variant_id_text::uuid as variant_id, least(sum(quantity), 99)::int as quantity, min(ord) as ord
    from req group by variant_id_text
  ),
  priced as (
    select d.variant_id, d.ord, d.quantity as requested,
           v.id is not null as is_found,
           p.slug, p.name as product_name, v.name as variant_name,
           (select count(*) from public.product_variants x
             where x.product_id = p.id and x.online_enabled and x.archived_at is null) as variant_count,
           (select jsonb_build_object('path', i.storage_path, 'alt', i.alt_text)
              from public.product_images i where i.product_id = p.id
              order by i.sort_order, i.created_at limit 1) as image,
           v.regular_price_cents as regular,
           private.effective_price_cents(v.id) as price,
           (v.id is not null and p.status = 'active' and p.visibility = 'published'
             and v.online_enabled and v.archived_at is null and p.pricing_type = 'fixed'
             and v.regular_price_cents is not null and v.stock_status <> 'out_of_stock') as available,
           case when v.track_inventory then v.stock_quantity end as stock_limit
    from dedup d
    left join public.product_variants v on v.id = d.variant_id
    left join public.products p on p.id = v.product_id
  ),
  lines as (
    select *,
           case
             when not is_found or product_name is null then 'not_found'
             when not available then 'unavailable'
             when requested = 0 then 'removed'
             when stock_limit is not null and requested > stock_limit then 'quantity_adjusted'
             else 'ok'
           end as status,
           case
             when not coalesce(available, false) then 0
             when stock_limit is not null then least(requested, stock_limit)
             else requested
           end as quantity
    from priced
  )
  select jsonb_build_object(
    'lines', coalesce(jsonb_agg(jsonb_build_object(
        'variant_id', variant_id,
        'status', status,
        'product_slug', slug,
        'product_name', product_name,
        'variant_name', case when variant_count > 1 or variant_name <> 'Standard' then variant_name end,
        'image', image,
        'unit_price_cents', case when available then price end,
        'regular_unit_price_cents', case when available then regular end,
        'requested_quantity', requested,
        'quantity', quantity,
        'line_total_cents', case when available then price * quantity else 0 end)
      order by ord) filter (where status <> 'not_found'), '[]'::jsonb),
    'subtotal_cents', coalesce(sum(case when available then price * quantity else 0 end), 0),
    'item_count', coalesce(sum(case when available then quantity else 0 end), 0),
    'has_issues', coalesce(bool_or(status not in ('ok', 'removed')), false)
  )
  into v_result
  from lines;

  return v_result;
end;
$$;

-- Product cards for a list of ids (wishlist). Unpublished ids are dropped.
create or replace function public.storefront_cards(p_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.product_card(p.id) order by array_position(p_ids, p.id)), '[]'::jsonb)
  from public.products p
  where p.id = any (p_ids[1:100])
    and p.status = 'active' and p.visibility = 'published'
$$;

create or replace function public.storefront_sitemap()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'products', coalesce((select jsonb_agg(jsonb_build_object('slug', p.slug, 'updated_at', p.updated_at))
                            from public.products p
                           where p.status = 'active' and p.visibility = 'published'), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(x.slug) from jsonb_to_recordset(public.storefront_categories())
                              as x(slug text)), '[]'::jsonb)
  )
$$;

-- Always reports success-shaped output, so it cannot be used to discover
-- whether an address is already subscribed.
create or replace function public.subscribe_newsletter(p_email text, p_source text default 'website')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  insert into public.newsletter_subscribers (email, source)
  values (v_email, left(coalesce(p_source, 'website'), 40))
  on conflict (email) do update
    set status = 'subscribed', unsubscribed_at = null
    where public.newsletter_subscribers.status = 'unsubscribed';

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges. Supabase grants EXECUTE on public functions to anon by
-- default, so every function is locked down explicitly.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.has_permission(text),
  private.is_active_staff(),
  private.current_staff_rank(),
  private.is_end_user_request(),
  private.current_mfa_level()
to anon, authenticated, service_role;

revoke execute on function
  public.storefront_settings(), public.storefront_categories(),
  public.storefront_products(text, text, text[], boolean, boolean, boolean, text, int, int),
  public.storefront_home(), public.storefront_product(text), public.storefront_price_cart(jsonb),
  public.storefront_sitemap(), public.storefront_cards(uuid[]), public.subscribe_newsletter(text, text)
from public;

grant execute on function
  public.storefront_settings(), public.storefront_categories(),
  public.storefront_products(text, text, text[], boolean, boolean, boolean, text, int, int),
  public.storefront_home(), public.storefront_product(text), public.storefront_price_cart(jsonb),
  public.storefront_sitemap(), public.storefront_cards(uuid[]), public.subscribe_newsletter(text, text)
to anon, authenticated, service_role;
