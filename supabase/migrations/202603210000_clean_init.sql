create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  account_type text not null default 'buyer' check (account_type in ('buyer', 'vendor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_app_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (id, email, account_type)
  values (
    new.id,
    coalesce(new.email, ''),
    case
      when new.raw_user_meta_data ->> 'account_type' in ('buyer', 'vendor', 'admin') then new.raw_user_meta_data ->> 'account_type'
      else 'buyer'
    end
  )
  on conflict (id) do update
  set email = excluded.email,
      account_type = excluded.account_type,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_auth_users_to_app_users_insert on auth.users;
create trigger trg_auth_users_to_app_users_insert
after insert on auth.users
for each row execute function public.set_app_user_from_auth();

drop trigger if exists trg_auth_users_to_app_users_update on auth.users;
create trigger trg_auth_users_to_app_users_update
after update of email, raw_user_meta_data on auth.users
for each row execute function public.set_app_user_from_auth();

insert into app_users (id, email, account_type)
select
  u.id,
  coalesce(u.email, ''),
  case
    when u.raw_user_meta_data ->> 'account_type' in ('buyer', 'vendor', 'admin') then u.raw_user_meta_data ->> 'account_type'
    else 'buyer'
  end
from auth.users u
on conflict (id) do nothing;

create table if not exists buyer_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null,
  industry text,
  contact_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendor_applications (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references auth.users(id) on delete set null,
  company_name text not null,
  country text,
  summary text,
  services text[] not null default '{}',
  portfolio_projects jsonb not null default '[]'::jsonb,
  min_rate numeric,
  max_rate numeric,
  team_size int,
  english_level text check (english_level in ('basic', 'medium', 'high')),
  japanese_support text check (japanese_support in ('basic', 'medium', 'high')),
  plan_key text not null default 'basic' check (plan_key in ('basic', 'translation')),
  preferred_language text check (preferred_language in ('en', 'ja', 'vi', 'id', 'th', 'pl', 'ro', 'ko', 'hi', 'uk', 'et', 'es', 'ms', 'tl')),
  website_url text,
  public_contact_email text,
  public_contact_phone text,
  contact_name text,
  contact_email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references auth.users(id) on delete set null,
  application_id uuid unique references vendor_applications(id) on delete set null,
  company_name text not null,
  country text,
  summary text,
  services text[] not null default '{}',
  portfolio_projects jsonb not null default '[]'::jsonb,
  min_rate numeric,
  max_rate numeric,
  team_size int,
  english_level text check (english_level in ('basic', 'medium', 'high')),
  japanese_support text check (japanese_support in ('basic', 'medium', 'high')),
  plan_key text not null default 'basic' check (plan_key in ('basic', 'translation')),
  preferred_language text check (preferred_language in ('en', 'ja', 'vi', 'id', 'th', 'pl', 'ro', 'ko', 'hi', 'uk', 'et', 'es', 'ms', 'tl')),
  website_url text,
  public_contact_email text,
  public_contact_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendor_billing_accounts (
  company_id uuid primary key references vendor_profiles(id) on delete cascade,
  application_id uuid references vendor_applications(id) on delete set null,
  company_name text not null,
  contact_email text not null,
  plan_key text not null default 'basic' check (plan_key in ('basic', 'translation')),
  translation_enabled boolean not null default false,
  monthly_price_jpy int not null default 5000,
  status text not null default 'pending_checkout' check (status in ('pending_checkout', 'active', 'paused', 'canceled')),
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

create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid not null references buyer_organizations(id) on delete cascade,
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (buyer_org_id, vendor_profile_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('buyer', 'vendor')),
  body text not null,
  original_language text,
  translated_body_ja text,
  translated_body_en text,
  translated_body_company text,
  created_at timestamptz not null default now()
);

create table if not exists message_reads (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create table if not exists deal_records (
  thread_id uuid primary key references message_threads(id) on delete cascade,
  title text,
  status text not null default '相談中' check (status in ('相談中', '進行中', '完了')),
  updated_at timestamptz not null default now(),
  updated_by_role text not null default 'buyer' check (updated_by_role in ('buyer', 'vendor'))
);

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists trg_buyer_organizations_updated_at on buyer_organizations;
create trigger trg_buyer_organizations_updated_at
before update on buyer_organizations
for each row execute function set_updated_at();

drop trigger if exists trg_vendor_applications_updated_at on vendor_applications;
create trigger trg_vendor_applications_updated_at
before update on vendor_applications
for each row execute function set_updated_at();

drop trigger if exists trg_vendor_profiles_updated_at on vendor_profiles;
create trigger trg_vendor_profiles_updated_at
before update on vendor_profiles
for each row execute function set_updated_at();

drop trigger if exists trg_vendor_billing_accounts_updated_at on vendor_billing_accounts;
create trigger trg_vendor_billing_accounts_updated_at
before update on vendor_billing_accounts
for each row execute function set_updated_at();

create or replace function set_thread_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update message_threads
  set last_message_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_update_thread_timestamp on messages;
create trigger trg_messages_update_thread_timestamp
after insert on messages
for each row execute function set_thread_last_message_at();

create index if not exists idx_buyer_organizations_owner_user_id on buyer_organizations(owner_user_id);
create index if not exists idx_vendor_applications_owner_user_id on vendor_applications(owner_user_id);
create index if not exists idx_vendor_applications_status on vendor_applications(status);
create index if not exists idx_vendor_profiles_owner_user_id on vendor_profiles(owner_user_id);
create index if not exists idx_vendor_profiles_active on vendor_profiles(active);
create index if not exists idx_message_threads_buyer_org_id on message_threads(buyer_org_id);
create index if not exists idx_message_threads_vendor_profile_id on message_threads(vendor_profile_id);
create index if not exists idx_message_threads_last_message_at on message_threads(last_message_at desc);
create index if not exists idx_messages_thread_id_created_at on messages(thread_id, created_at);
create index if not exists idx_message_reads_user_id on message_reads(user_id);

alter table app_users enable row level security;
alter table buyer_organizations enable row level security;
alter table vendor_applications enable row level security;
alter table vendor_profiles enable row level security;
alter table vendor_billing_accounts enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table message_reads enable row level security;
alter table deal_records enable row level security;

create policy app_users_self_select on app_users
for select using (id = auth.uid());

create policy app_users_self_update on app_users
for update using (id = auth.uid())
with check (id = auth.uid());

create policy buyer_organizations_owner_rw on buyer_organizations
for all using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy vendor_applications_owner_rw on vendor_applications
for all using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy vendor_profiles_public_read on vendor_profiles
for select using (active = true);

create policy vendor_profiles_owner_rw on vendor_profiles
for all using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy vendor_billing_accounts_owner_rw on vendor_billing_accounts
for all using (
  exists (
    select 1
    from vendor_profiles v
    where v.id = vendor_billing_accounts.company_id
      and v.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from vendor_profiles v
    where v.id = vendor_billing_accounts.company_id
      and v.owner_user_id = auth.uid()
  )
);

create policy message_threads_participant_rw on message_threads
for all using (
  exists (
    select 1
    from buyer_organizations b
    where b.id = message_threads.buyer_org_id
      and b.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from vendor_profiles v
    where v.id = message_threads.vendor_profile_id
      and v.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from buyer_organizations b
    where b.id = message_threads.buyer_org_id
      and b.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from vendor_profiles v
    where v.id = message_threads.vendor_profile_id
      and v.owner_user_id = auth.uid()
  )
);

create policy messages_participant_select on messages
for select using (
  exists (
    select 1
    from message_threads t
    left join buyer_organizations b on b.id = t.buyer_org_id
    left join vendor_profiles v on v.id = t.vendor_profile_id
    where t.id = messages.thread_id
      and (b.owner_user_id = auth.uid() or v.owner_user_id = auth.uid())
  )
);

create policy messages_participant_insert on messages
for insert with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from message_threads t
    left join buyer_organizations b on b.id = t.buyer_org_id
    left join vendor_profiles v on v.id = t.vendor_profile_id
    where t.id = messages.thread_id
      and (b.owner_user_id = auth.uid() or v.owner_user_id = auth.uid())
  )
);

create policy message_reads_participant_rw on message_reads
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy deal_records_participant_rw on deal_records
for all using (
  exists (
    select 1
    from message_threads t
    left join buyer_organizations b on b.id = t.buyer_org_id
    left join vendor_profiles v on v.id = t.vendor_profile_id
    where t.id = deal_records.thread_id
      and (b.owner_user_id = auth.uid() or v.owner_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from message_threads t
    left join buyer_organizations b on b.id = t.buyer_org_id
    left join vendor_profiles v on v.id = t.vendor_profile_id
    where t.id = deal_records.thread_id
      and (b.owner_user_id = auth.uid() or v.owner_user_id = auth.uid())
  )
);
