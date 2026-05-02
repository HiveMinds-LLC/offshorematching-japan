alter table messages
add column if not exists translated_body_company_language text;

update messages m
set translated_body_company_language = vp.preferred_language
from message_threads mt
join vendor_profiles vp
  on vp.id = mt.vendor_profile_id
where m.thread_id = mt.id
  and m.translated_body_company is not null
  and m.translated_body_company_language is null
  and vp.preferred_language is not null;
