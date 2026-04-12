alter table vendor_profiles
  add column if not exists contact_name text;

update vendor_profiles vp
set contact_name = va.contact_name
from vendor_applications va
where vp.application_id = va.id
  and vp.contact_name is null;

alter table vendor_profiles
  drop constraint if exists vendor_profiles_english_level_check;

alter table vendor_profiles
  add constraint vendor_profiles_english_level_check
  check (english_level in ('basic', 'medium', 'high', 'native'));

alter table vendor_profiles
  drop constraint if exists vendor_profiles_japanese_support_check;

alter table vendor_profiles
  add constraint vendor_profiles_japanese_support_check
  check (japanese_support in ('basic', 'medium', 'high', 'native'));

alter table vendor_applications
  drop constraint if exists vendor_applications_english_level_check;

alter table vendor_applications
  add constraint vendor_applications_english_level_check
  check (english_level in ('basic', 'medium', 'high', 'native'));

alter table vendor_applications
  drop constraint if exists vendor_applications_japanese_support_check;

alter table vendor_applications
  add constraint vendor_applications_japanese_support_check
  check (japanese_support in ('basic', 'medium', 'high', 'native'));
