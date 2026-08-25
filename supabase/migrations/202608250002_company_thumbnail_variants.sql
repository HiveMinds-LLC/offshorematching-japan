-- Adds a compact directory variant to the original company image migration.
alter table vendor_applications
  add column if not exists thumbnail_card_url text,
  add column if not exists thumbnail_card_path text;

alter table vendor_profiles
  add column if not exists thumbnail_card_url text,
  add column if not exists thumbnail_card_path text;

update storage.buckets
set file_size_limit = 524288,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'company-thumbnails';

drop policy if exists "Vendors insert own company thumbnail" on storage.objects;
drop policy if exists "Vendors update own company thumbnail" on storage.objects;
drop policy if exists "Vendors delete own company thumbnail" on storage.objects;

create policy "Vendors insert own company thumbnail"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) in ('thumbnail', 'thumbnail-card')
  and exists (
    select 1 from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
);

create policy "Vendors update own company thumbnail"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) in ('thumbnail', 'thumbnail-card')
  and exists (
    select 1 from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
)
with check (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) in ('thumbnail', 'thumbnail-card')
  and exists (
    select 1 from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
);

create policy "Vendors delete own company thumbnail"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-thumbnails'
  and storage.filename(name) in ('thumbnail', 'thumbnail-card')
  and exists (
    select 1 from public.vendor_profiles vp
    where vp.id::text = (storage.foldername(name))[1]
      and vp.owner_user_id = auth.uid()
  )
);
