alter table if exists vendor_applications
add column if not exists terms_accepted_at timestamptz,
add column if not exists terms_version text;

create table if not exists vendor_billing_accounts (
  company_id uuid primary key,
  application_id uuid references vendor_applications(id) on delete set null,
  company_name text not null,
  contact_email text not null,
  monthly_price_jpy int not null default 5000,
  status text not null default 'pending_checkout',
  terms_accepted_at timestamptz,
  terms_version text,
  current_period_end timestamptz,
  pause_requested_at timestamptz,
  canceled_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_vendor_billing_accounts_updated_at on vendor_billing_accounts;
create trigger trg_vendor_billing_accounts_updated_at
before update on vendor_billing_accounts
for each row execute function set_updated_at();

alter table vendor_billing_accounts enable row level security;

create policy vendor_billing_accounts_owner_rw on vendor_billing_accounts
for all using (
  exists (
    select 1 from vendor_profiles v
    where v.id = vendor_billing_accounts.company_id and v.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from vendor_profiles v
    where v.id = vendor_billing_accounts.company_id and v.owner_user_id = auth.uid()
  )
);
