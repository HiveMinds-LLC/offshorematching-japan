-- Browser clients use the public Supabase URL/key only for authentication.
-- All application data mutations must go through the validated Next.js API,
-- which uses the server-only Supabase key.  This removes owner-write access
-- from PostgREST and Storage while retaining the reads used by the app.

drop policy if exists app_users_self_update on app_users;

drop policy if exists buyer_organizations_owner_rw on buyer_organizations;
create policy buyer_organizations_owner_select on buyer_organizations
for select using (owner_user_id = auth.uid());

drop policy if exists vendor_applications_owner_rw on vendor_applications;
create policy vendor_applications_owner_select on vendor_applications
for select using (owner_user_id = auth.uid());

drop policy if exists vendor_profiles_owner_rw on vendor_profiles;
create policy vendor_profiles_owner_select on vendor_profiles
for select using (owner_user_id = auth.uid());

drop policy if exists vendor_billing_accounts_owner_rw on vendor_billing_accounts;
create policy vendor_billing_accounts_owner_select on vendor_billing_accounts
for select using (
  exists (
    select 1 from vendor_profiles v
    where v.id = vendor_billing_accounts.company_id
      and v.owner_user_id = auth.uid()
  )
);

drop policy if exists message_threads_participant_rw on message_threads;
create policy message_threads_participant_select on message_threads
for select using (
  exists (
    select 1 from buyer_organizations b
    where b.id = message_threads.buyer_org_id
      and b.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from vendor_profiles v
    where v.id = message_threads.vendor_profile_id
      and v.owner_user_id = auth.uid()
  )
);

drop policy if exists messages_participant_insert on messages;

drop policy if exists message_reads_participant_rw on message_reads;
create policy message_reads_participant_select on message_reads
for select using (user_id = auth.uid());

drop policy if exists deal_records_participant_rw on deal_records;
create policy deal_records_participant_select on deal_records
for select using (
  exists (
    select 1
    from message_threads t
    left join buyer_organizations b on b.id = t.buyer_org_id
    left join vendor_profiles v on v.id = t.vendor_profile_id
    where t.id = deal_records.thread_id
      and (b.owner_user_id = auth.uid() or v.owner_user_id = auth.uid())
  )
);

drop policy if exists buyer_saved_companies_rw on buyer_saved_companies;
create policy buyer_saved_companies_owner_select on buyer_saved_companies
for select using (
  exists (
    select 1 from buyer_organizations b
    where b.id = buyer_saved_companies.buyer_org_id
      and b.owner_user_id = auth.uid()
  )
);

drop policy if exists "Vendors insert own company thumbnail" on storage.objects;
drop policy if exists "Vendors update own company thumbnail" on storage.objects;
drop policy if exists "Vendors delete own company thumbnail" on storage.objects;
