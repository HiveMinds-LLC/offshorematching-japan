create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists buyer_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  industry text,
  contact_name text,
  created_at timestamptz not null default now(),
  unique(owner_user_id)
);

create table if not exists vendor_applications (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  company_name text not null,
  country text,
  summary text,
  services text[] not null default '{}',
  min_rate numeric,
  max_rate numeric,
  team_size int,
  english_level text,
  japanese_support text,
  plan_key text not null default 'developer',
  website_url text,
  public_contact_email text,
  public_contact_phone text,
  contact_name text,
  contact_email text,
  status text not null default 'pending',
  review_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  application_id uuid references vendor_applications(id) on delete set null,
  company_name text not null,
  country text,
  summary text,
  services text[] not null default '{}',
  min_rate numeric,
  max_rate numeric,
  team_size int,
  english_level text,
  japanese_support text,
  plan_key text not null default 'developer',
  website_url text,
  public_contact_email text,
  public_contact_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists boosts (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  score_bonus int not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid not null references buyer_organizations(id) on delete cascade,
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique(buyer_org_id, vendor_profile_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists message_reads (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique(thread_id, user_id)
);

create table if not exists vendor_profile_embeddings (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vendor_profile_embeddings_hnsw_idx
on vendor_profile_embeddings
using hnsw (embedding vector_cosine_ops);

create table if not exists requirement_embeddings (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid references buyer_organizations(id) on delete set null,
  raw_text text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists requirement_embeddings_hnsw_idx
on requirement_embeddings
using hnsw (embedding vector_cosine_ops);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vendor_profiles_updated_at on vendor_profiles;
create trigger trg_vendor_profiles_updated_at
before update on vendor_profiles
for each row execute function set_updated_at();

alter table buyer_organizations enable row level security;
alter table vendor_applications enable row level security;
alter table vendor_profiles enable row level security;
alter table boosts enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table message_reads enable row level security;
alter table vendor_profile_embeddings enable row level security;
alter table requirement_embeddings enable row level security;

create policy buyer_org_owner_rw on buyer_organizations
for all using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy vendor_application_owner_rw on vendor_applications
for all using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy vendor_profiles_public_read on vendor_profiles
for select using (active = true);

create policy vendor_profiles_owner_rw on vendor_profiles
for all using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy boosts_public_read on boosts
for select using (true);

create policy boosts_vendor_owner_rw on boosts
for all using (
  exists (
    select 1 from vendor_profiles vp
    where vp.id = boosts.vendor_profile_id and vp.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from vendor_profiles vp
    where vp.id = boosts.vendor_profile_id and vp.owner_user_id = auth.uid()
  )
);

create policy message_threads_participant_rw on message_threads
for all using (
  exists (select 1 from buyer_organizations b where b.id = message_threads.buyer_org_id and b.owner_user_id = auth.uid())
  or exists (select 1 from vendor_profiles v where v.id = message_threads.vendor_profile_id and v.owner_user_id = auth.uid())
)
with check (
  exists (select 1 from buyer_organizations b where b.id = message_threads.buyer_org_id and b.owner_user_id = auth.uid())
  or exists (select 1 from vendor_profiles v where v.id = message_threads.vendor_profile_id and v.owner_user_id = auth.uid())
);

create policy messages_participant_rw on messages
for all using (
  exists (
    select 1 from message_threads t
    left join buyer_organizations b on b.id = t.buyer_org_id
    left join vendor_profiles v on v.id = t.vendor_profile_id
    where t.id = messages.thread_id and (b.owner_user_id = auth.uid() or v.owner_user_id = auth.uid())
  )
)
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1 from message_threads t
    left join buyer_organizations b on b.id = t.buyer_org_id
    left join vendor_profiles v on v.id = t.vendor_profile_id
    where t.id = messages.thread_id and (b.owner_user_id = auth.uid() or v.owner_user_id = auth.uid())
  )
);

create policy message_reads_participant_rw on message_reads
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy vendor_profile_embeddings_owner_rw on vendor_profile_embeddings
for all using (
  exists (
    select 1 from vendor_profiles v where v.id = vendor_profile_embeddings.vendor_profile_id and v.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from vendor_profiles v where v.id = vendor_profile_embeddings.vendor_profile_id and v.owner_user_id = auth.uid()
  )
);

create policy requirement_embeddings_owner_rw on requirement_embeddings
for all using (
  exists (
    select 1 from buyer_organizations b where b.id = requirement_embeddings.buyer_org_id and b.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from buyer_organizations b where b.id = requirement_embeddings.buyer_org_id and b.owner_user_id = auth.uid()
  )
);
