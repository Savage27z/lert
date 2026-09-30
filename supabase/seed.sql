-- ============================================================================
-- ADISAH catalog seed — sourced from the ADISAH point-of-sale screenshots.
--
-- Rules followed (see docs/CATALOG-REVIEW.md):
--   * `source_name` is the POS name exactly as shown. `name` is the
--     customer-facing name; the only change made is moving pack sizes into the
--     variant (e.g. "Milo 400G" -> product "Milo", variant "400 g").
--   * Nothing is invented: unknown sizes, truncated variant titles, and
--     unknown prices are left empty, flagged `needs_review`, and kept off the
--     storefront until confirmed.
--   * Stock quantities are not in the source data, so inventory is not tracked
--     yet (manual status). Items the POS shows as sold out are out_of_stock.
--   * Category assignments and `is_featured` are merchandising defaults,
--     editable in Store Operations.
-- ============================================================================

insert into public.categories (slug, name, sort_order) values
  ('rice-grains',          'Rice, Grains & Noodles',  10),
  ('beans-legumes',        'Beans & Legumes',         20),
  ('flours-swallow',       'Flours & Swallow',        30),
  ('spices-seasonings',    'Spices & Seasonings',     40),
  ('pastes-canned',        'Pastes & Canned Foods',   50),
  ('breakfast-beverages',  'Breakfast & Beverages',   60),
  ('snacks',               'Snacks & Biscuits',       70),
  ('vegetables-leaves',    'Vegetables & Leaves',     80),
  ('meat-fish',            'Meat & Fish',             90),
  ('herbal-bitters',       'Herbal & Bitters',       100),
  ('beauty-personal-care', 'Beauty & Personal Care', 110),
  ('kitchen-household',    'Kitchen & Household',    120)
on conflict (slug) do nothing;

insert into public.brands (slug, name) values
  ('checkers', 'Checkers'), ('derica', 'Derica'), ('exeter', 'Exeter'), ('funbact', 'Funbact'),
  ('geisha', 'Geisha'), ('gino', 'Gino'), ('golden-morn', 'Golden Morn'), ('indomie', 'Indomie'),
  ('jekonmo', 'Jekonmo'), ('lady-b', 'Lady B'), ('maggi', 'Maggi'), ('milo', 'Milo'),
  ('nido', 'Nido'), ('ole-koko', 'Ole Koko'), ('par-excellence', 'Par Excellence'),
  ('peak', 'Peak'), ('st-louis', 'St Louis'), ('titus', 'Titus')
on conflict (slug) do nothing;

do $$
declare
  v_catalog jsonb := $json$
  [
    {"source": "Brown Beans 4lbs", "name": "Brown Beans", "category": "beans-legumes", "featured": true,
     "variants": [{"name": "4 lbs", "price": 884}]},
    {"source": "Checkers Milk Custard 1.5kg", "name": "Checkers Milk Custard", "category": "breakfast-beverages", "brand": "checkers",
     "variants": [{"name": "1.5 kg", "price": 1500}]},
    {"source": "Coco Samba", "name": "Coco Samba", "price": 500,
     "review": "Product type is unclear from the POS name. Confirm category, pack size and description."},
    {"source": "Crayfish", "name": "Crayfish", "category": "spices-seasonings", "price": 999,
     "review": "Pack size not shown in POS."},
    {"source": "Cut Bitter Leaf", "name": "Cut Bitter Leaf", "category": "vegetables-leaves", "price": 509, "keywords": ["bitterleaf"],
     "review": "POS also lists \"Uncut Bitterleaf\" (one word). Confirm the preferred spelling and pack size for both."},
    {"source": "De Rica", "name": "De Rica", "category": "pastes-canned", "brand": "derica", "price": 400, "keywords": ["derica", "tomato paste"],
     "review": "May be related to \"Derica Paste 210g\". Confirm whether this is a different size or product."},
    {"source": "Derica Paste 210g", "name": "Derica Paste 210g", "category": "pastes-canned", "brand": "derica", "keywords": ["tomato paste", "de rica"],
     "variants": [
       {"name": "Regular", "source": "Regular", "price": 299, "sku": "M719440",
        "review": "SKU M719440 was visible in POS; confirm it belongs to this variant."},
       {"name": "Second variant (title pending)", "price": 499, "online": false,
        "review": "Variant title is truncated in the POS screenshot. Enter the real size/title before enabling online."}
     ]},
    {"source": "Dry Pepper", "name": "Dry Pepper", "category": "spices-seasonings", "price": 599},
    {"source": "Exeter Corned Beef 12oz", "name": "Exeter Corned Beef", "category": "pastes-canned", "brand": "exeter",
     "variants": [{"name": "12 oz", "price": 500}]},
    {"source": "Funbact A", "name": "Funbact A", "category": "beauty-personal-care", "brand": "funbact", "price": 299,
     "review": "Pack size not shown in POS."},
    {"source": "Gari Ijebu 4lbs", "name": "Gari Ijebu", "category": "flours-swallow", "keywords": ["garri", "gary", "ijebu garri"], "hidden": true,
     "review": "POS shows multiple prices. Add each variant (size/title and price) before publishing."},
    {"source": "Geisha (Green) 15 OZ", "name": "Geisha (Green)", "category": "pastes-canned", "brand": "geisha",
     "variants": [{"name": "15 oz", "price": 450}]},
    {"source": "Gino Tomato Paste 210g", "name": "Gino Tomato Paste 210g", "category": "pastes-canned", "brand": "gino", "featured": true,
     "variants": [
       {"name": "Regular", "source": "Regular", "price": 299, "sku": "Y781787",
        "review": "SKU Y781787 was visible in POS; confirm it belongs to this variant."},
       {"name": "Second variant (title pending)", "price": 499, "online": false,
        "review": "Variant title is truncated in the POS screenshot. Enter the real size/title before enabling online."}
     ]},
    {"source": "Goat Meat", "name": "Goat Meat", "category": "meat-fish", "pricing": "variable",
     "variants": [{"name": "Standard", "stock": "out_of_stock"}],
     "review": "Variable price in POS. Decide the online workflow (per lb, quote, pickup only, in store only)."},
    {"source": "Golden Morn 900G", "name": "Golden Morn", "category": "breakfast-beverages", "brand": "golden-morn", "featured": true,
     "variants": [{"name": "900 g", "price": 1299}]},
    {"source": "Honey", "name": "Honey", "category": "breakfast-beverages", "price": 699,
     "review": "Brand and size not shown in POS."},
    {"source": "Honey Beans 4lbs", "name": "Honey Beans", "category": "beans-legumes", "featured": true, "keywords": ["ewa oloyin", "oloyin"],
     "variants": [
       {"name": "4 lbs", "source": "Honey Beans 4lbs", "price": 884, "sku": "605327C",
        "review": "SKU 605327C was visible in POS; confirm it belongs to the 4 lbs variant."},
       {"name": "10 lbs", "source": "Honey Beans 10lbs", "price": 2299}
     ]},
    {"source": "Indomie Onions", "name": "Indomie Onions", "category": "rice-grains", "brand": "indomie", "keywords": ["noodles"], "hidden": true,
     "review": "POS shows multiple prices. Add each variant (size/title and price) before publishing."},
    {"source": "Jekonmo Herbal Bitters 100ML", "name": "Jekonmo Herbal Bitters", "category": "herbal-bitters", "brand": "jekonmo",
     "variants": [{"name": "100 ml", "price": 500}]},
    {"source": "Jute Leaf", "name": "Jute Leaf", "category": "vegetables-leaves", "price": 315, "keywords": ["ewedu"]},
    {"source": "Kick & Start", "name": "Kick & Start", "price": 500,
     "review": "Product type is unclear from the POS name. Confirm category, pack size and description."},
    {"source": "Lady B Custard 1.6kg", "name": "Lady B Custard", "category": "breakfast-beverages", "brand": "lady-b", "featured": true,
     "variants": [{"name": "1.6 kg", "price": 1325}]},
    {"source": "Lion Curry", "name": "Lion Curry", "category": "spices-seasonings", "price": 199},
    {"source": "Locust Beans 8oz", "name": "Locust Beans", "category": "spices-seasonings", "keywords": ["iru", "dawadawa"],
     "variants": [{"name": "8 oz", "price": 599}]},
    {"source": "Mackerel", "name": "Mackerel", "category": "meat-fish", "pricing": "variable",
     "variants": [{"name": "Standard", "stock": "out_of_stock"}],
     "review": "Variable price in POS. Decide the online workflow (per lb, quote, pickup only, in store only)."},
    {"source": "Maggi Star", "name": "Maggi Star", "category": "spices-seasonings", "brand": "maggi", "price": 293, "keywords": ["seasoning cubes"]},
    {"source": "Mcvite Shortbread 200g", "name": "Mcvite Shortbread", "category": "snacks", "keywords": ["mcvities", "biscuits"],
     "variants": [{"name": "200 g", "price": 298}],
     "review": "Possibly \"McVitie's\". Confirm the spelling before correcting the customer-facing name."},
    {"source": "Milo 400G", "name": "Milo", "category": "breakfast-beverages", "brand": "milo", "featured": true,
     "variants": [{"name": "400 g", "price": 1475}]},
    {"source": "Moinmoin Pouch 20pc", "name": "Moinmoin Pouch", "category": "kitchen-household", "keywords": ["moi moi", "moimoi", "moin moin"],
     "variants": [{"name": "20 pc", "price": 1200}]},
    {"source": "Mudet Herbal Mixture", "name": "Mudet Herbal Mixture", "category": "herbal-bitters", "price": 500,
     "review": "Pack size not shown in POS."},
    {"source": "Nido 400G", "name": "Nido", "category": "breakfast-beverages", "brand": "nido",
     "variants": [{"name": "400 g", "price": 975}]},
    {"source": "Olaola Yam 5lbs", "name": "Olaola Yam", "category": "flours-swallow", "keywords": ["yam flour", "poundo"], "hidden": true,
     "review": "POS shows multiple prices. Add each variant (size/title and price) before publishing."},
    {"source": "Ole Koko Bitters 100ML", "name": "Ole Koko Bitters", "category": "herbal-bitters", "brand": "ole-koko",
     "variants": [{"name": "100 ml", "price": 500}]},
    {"source": "Par Excellence Rice 25lbs", "name": "Par Excellence Rice", "category": "rice-grains", "brand": "par-excellence", "hidden": true,
     "review": "POS shows multiple prices. Add each variant (size/title and price) before publishing."},
    {"source": "Peak Liquid 158ml", "name": "Peak Liquid", "category": "breakfast-beverages", "brand": "peak", "featured": true, "keywords": ["evaporated milk"],
     "variants": [{"name": "158 ml", "price": 149}]},
    {"source": "Peak Milk Powder 400G", "name": "Peak Milk Powder", "category": "breakfast-beverages", "brand": "peak", "hidden": true,
     "review": "POS shows three prices. Add each variant (size/title and price) before publishing."},
    {"source": "Plantain Chips", "name": "Plantain Chips", "category": "snacks", "price": 299, "featured": true,
     "review": "Brand and size not shown in POS."},
    {"source": "Plum", "name": "Plum", "price": 1499,
     "review": "Product type is unclear from the POS name. Confirm category, pack size and description."},
    {"source": "Pundu", "name": "Pundu", "category": "vegetables-leaves", "price": 699, "keywords": ["pondu"],
     "review": "Confirm description and pack size."},
    {"source": "Scent Leaf", "name": "Scent Leaf", "category": "vegetables-leaves", "price": 599, "keywords": ["efirin", "nchanwu"]},
    {"source": "Smooth Cassava", "name": "Smooth Cassava", "category": "flours-swallow", "price": 699,
     "review": "Confirm product type and pack size."},
    {"source": "Spinach", "name": "Spinach", "category": "vegetables-leaves", "price": 509},
    {"source": "St Louis Sugar Cube 500G", "name": "St Louis Sugar Cube", "category": "breakfast-beverages", "brand": "st-louis",
     "variants": [{"name": "500 g", "price": 546}]},
    {"source": "Suya Spice", "name": "Suya Spice", "category": "spices-seasonings", "price": 599, "featured": true, "keywords": ["yaji"]},
    {"source": "Tapioca 700G", "name": "Tapioca", "category": "rice-grains",
     "variants": [{"name": "700 g", "price": 799}]},
    {"source": "Thyme", "name": "Thyme", "category": "spices-seasonings", "price": 199},
    {"source": "Titus Sardine 125g", "name": "Titus Sardine", "category": "pastes-canned", "brand": "titus", "featured": true,
     "variants": [{"name": "125 g", "price": 199}]},
    {"source": "Ugu", "name": "Ugu", "category": "vegetables-leaves", "price": 509, "keywords": ["pumpkin leaves", "fluted pumpkin"]},
    {"source": "Uncut Bitterleaf", "name": "Uncut Bitterleaf", "category": "vegetables-leaves", "price": 509, "keywords": ["bitter leaf"],
     "review": "POS also lists \"Cut Bitter Leaf\" (two words). Confirm the preferred spelling and pack size for both."},
    {"source": "Water Leaf", "name": "Water Leaf", "category": "vegetables-leaves", "price": 499, "keywords": ["waterleaf", "gbure"]},
    {"source": "Whitening Fish", "name": "Whitening Fish", "category": "meat-fish", "pricing": "variable", "keywords": ["whiting"],
     "variants": [{"name": "Standard", "stock": "out_of_stock"}],
     "review": "Variable price in POS. Decide the online workflow. Also confirm the name (possibly \"Whiting\")."}
  ]
  $json$;
  v_item    jsonb;
  v_variant jsonb;
  v_product uuid;
  v_order   int;
  v_review  boolean;
begin
  for v_item in select * from jsonb_array_elements(v_catalog) loop
    if exists (select 1 from public.products where source_name = v_item ->> 'source') then
      continue;
    end if;

    v_review := v_item ? 'review'
      or exists (select 1 from jsonb_array_elements(coalesce(v_item -> 'variants', '[]')) x where x ? 'review');

    insert into public.products (slug, name, source_name, category_id, brand_id, status, visibility,
                                 pricing_type, is_featured, search_keywords, needs_review, review_notes)
    values (
      private.slugify(v_item ->> 'name'),
      v_item ->> 'name',
      v_item ->> 'source',
      (select id from public.categories where slug = v_item ->> 'category'),
      (select id from public.brands where slug = v_item ->> 'brand'),
      'active',
      case when coalesce((v_item ->> 'hidden')::boolean, false) then 'hidden' else 'published' end,
      coalesce(v_item ->> 'pricing', 'fixed'),
      coalesce((v_item ->> 'featured')::boolean, false),
      coalesce(array(select jsonb_array_elements_text(v_item -> 'keywords')), '{}'),
      v_review,
      v_item ->> 'review'
    )
    returning id into v_product;

    -- Single-price products get one "Standard" variant.
    if v_item ? 'price' then
      v_item := v_item || jsonb_build_object('variants',
        jsonb_build_array(jsonb_build_object('name', 'Standard', 'price', v_item -> 'price')));
    end if;

    v_order := 0;
    for v_variant in select * from jsonb_array_elements(coalesce(v_item -> 'variants', '[]')) loop
      v_order := v_order + 10;
      insert into public.product_variants (product_id, name, source_name, sku, regular_price_cents,
                                           manual_stock_status, online_enabled, sort_order,
                                           needs_review, review_notes)
      values (
        v_product,
        v_variant ->> 'name',
        v_variant ->> 'source',
        v_variant ->> 'sku',
        (v_variant ->> 'price')::int,
        coalesce(v_variant ->> 'stock', 'in_stock'),
        coalesce((v_variant ->> 'online')::boolean, true),
        v_order,
        v_variant ? 'review',
        v_variant ->> 'review'
      );
    end loop;
  end loop;
end;
$$;
