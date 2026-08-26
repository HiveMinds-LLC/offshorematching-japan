-- The bucket is public, so known public object URLs can be served without a broad
-- storage.objects SELECT policy. Removing it prevents client-side bucket listing.
drop policy if exists "Public read company thumbnails" on storage.objects;
