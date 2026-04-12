create table if not exists buyer_saved_companies (
  buyer_org_id uuid not null references buyer_organizations(id) on delete cascade,
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_org_id, vendor_profile_id)
);

create index if not exists idx_buyer_saved_companies_buyer_org_id
on buyer_saved_companies(buyer_org_id, created_at desc);

alter table buyer_saved_companies enable row level security;

create policy buyer_saved_companies_rw on buyer_saved_companies
for all
using (
  exists (
    select 1
    from buyer_organizations b
    where b.id = buyer_saved_companies.buyer_org_id
      and b.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from buyer_organizations b
    where b.id = buyer_saved_companies.buyer_org_id
      and b.owner_user_id = auth.uid()
  )
);
