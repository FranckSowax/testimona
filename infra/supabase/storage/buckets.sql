-- ============================================================================
-- Testimona — Supabase Storage buckets and RLS policies
-- ============================================================================
-- Apply once with: psql $SUPABASE_DB -f infra/supabase/storage/buckets.sql
-- Or via: prisma db execute --file infra/supabase/storage/buckets.sql
--
-- Convention: every uploaded object lives under "<scopeId>/<filename>".
-- Folder-level checks are used to enforce ownership.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Bucket: avatars (per-user profile picture, public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_self" on storage.objects;
create policy "avatars_insert_self" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_self" on storage.objects;
create policy "avatars_update_self" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_self" on storage.objects;
create policy "avatars_delete_self" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Bucket: memorial-photos (uploaded by memorial owners, public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memorial-photos',
  'memorial-photos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "memorial_photos_select_public" on storage.objects;
create policy "memorial_photos_select_public" on storage.objects
  for select
  using (bucket_id = 'memorial-photos');

-- Path convention: "<memorialId>/<filename>". Insert allowed only when the
-- caller owns the memorial referenced by the first folder segment.
drop policy if exists "memorial_photos_insert_owner" on storage.objects;
create policy "memorial_photos_insert_owner" on storage.objects
  for insert
  with check (
    bucket_id = 'memorial-photos'
    and auth.uid() is not null
    and exists (
      select 1 from public."Memorial" m
      where m.id::text = (storage.foldername(name))[1]
        and m."ownerId" = auth.uid()
    )
  );

drop policy if exists "memorial_photos_update_owner" on storage.objects;
create policy "memorial_photos_update_owner" on storage.objects
  for update
  using (
    bucket_id = 'memorial-photos'
    and exists (
      select 1 from public."Memorial" m
      where m.id::text = (storage.foldername(name))[1]
        and m."ownerId" = auth.uid()
    )
  )
  with check (
    bucket_id = 'memorial-photos'
    and exists (
      select 1 from public."Memorial" m
      where m.id::text = (storage.foldername(name))[1]
        and m."ownerId" = auth.uid()
    )
  );

drop policy if exists "memorial_photos_delete_owner" on storage.objects;
create policy "memorial_photos_delete_owner" on storage.objects
  for delete
  using (
    bucket_id = 'memorial-photos'
    and exists (
      select 1 from public."Memorial" m
      where m.id::text = (storage.foldername(name))[1]
        and m."ownerId" = auth.uid()
    )
  );
