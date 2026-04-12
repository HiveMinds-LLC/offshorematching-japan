alter table vendor_billing_accounts
  add column if not exists stripe_subscription_schedule_id text;

create index if not exists idx_vendor_billing_accounts_schedule_id
  on vendor_billing_accounts (stripe_subscription_schedule_id);
