alter table vendor_applications
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_path text;

alter table vendor_profiles
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-thumbnails',
  'company-thumbnails',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- One company has one canonical image object: {company-id}/thumbnail.
-- The app currently writes through a server-side authenticated route, but these
-- policies also make direct vendor uploads safe if the client flow changes later.
drop policy if exists "Public read company thumbnails" on storage.objects;
drop policy if exists "Vendors insert own company thumbnail" on storage.objects;
drop policy if exists "Vendors update own company thumbnail" on storage.objects;
drop policy if exists "Vendors delete own company thumbnail" on storage.objects;

create policy "Public read company thumbnails"
on storage.objects for select
to public
using (bucket_id = 'company-thumbnails');

create policy "Vendors insert own company thumbnail"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) = 'thumbnail'
  and exists (
    select 1
    from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
);

create policy "Vendors update own company thumbnail"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) = 'thumbnail'
  and exists (
    select 1
    from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
)
with check (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) = 'thumbnail'
  and exists (
    select 1
    from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
);

create policy "Vendors delete own company thumbnail"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) = 'thumbnail'
  and exists (
    select 1
    from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
);
