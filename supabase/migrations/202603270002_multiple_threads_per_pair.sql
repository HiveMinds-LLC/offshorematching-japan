alter table message_threads
drop constraint if exists message_threads_buyer_org_id_vendor_profile_id_key;

create index if not exists idx_message_threads_buyer_vendor_pair
on message_threads(buyer_org_id, vendor_profile_id, last_message_at desc);
