alter table vendor_billing_accounts
  add column if not exists pending_plan_key text check (pending_plan_key in ('basic', 'translation'));

alter table vendor_billing_accounts
  add column if not exists pending_plan_effective_at timestamptz;
