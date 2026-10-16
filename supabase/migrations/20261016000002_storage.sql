-- =============================================================================
-- VISTA DO LAGO — Supabase Storage (imagens da galeria, lotes e planta)
-- Leitura pública; envio, alteração e exclusão apenas por administradores.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "media public read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
