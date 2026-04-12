alter table vendor_profiles
  add column if not exists summary_ja text;

alter table vendor_applications
  add column if not exists summary_ja text;
