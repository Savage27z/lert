-- ============================================================================
-- Product image storage (Supabase Storage). Public read so the CDN can serve
-- images; only staff with catalog.write may upload, replace or delete.
-- Guarded so the migration is a no-op on plain Postgres (local test runs).
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not present; skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('product-images', 'product-images', true, 5242880,
          array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  execute $p$
    create policy "catalog writers upload product images" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'product-images' and (select private.has_permission('catalog.write')))
  $p$;
  execute $p$
    create policy "catalog writers update product images" on storage.objects
      for update to authenticated
      using (bucket_id = 'product-images' and (select private.has_permission('catalog.write')))
  $p$;
  execute $p$
    create policy "catalog writers delete product images" on storage.objects
      for delete to authenticated
      using (bucket_id = 'product-images' and (select private.has_permission('catalog.write')))
  $p$;
end;
$$;
