alter table vendor_profiles
  alter column active set default false;

alter table vendor_profiles
  add column if not exists published_at timestamptz;

update vendor_profiles vp
set application_id = va.id
from vendor_applications va
where vp.owner_user_id = va.owner_user_id
  and vp.application_id is null;

insert into vendor_profiles (
  id,
  owner_user_id,
  application_id,
  company_name,
  country,
  contact_name,
  summary,
  services,
  portfolio_projects,
  min_rate,
  max_rate,
  team_size,
  english_level,
  japanese_support,
  plan_key,
  preferred_language,
  website_url,
  public_contact_email,
  public_contact_phone,
  active,
  published_at
)
select
  va.id,
  va.owner_user_id,
  va.id,
  va.company_name,
  va.country,
  va.contact_name,
  va.summary,
  coalesce(va.services, '{}'),
  coalesce(va.portfolio_projects, '[]'::jsonb),
  va.min_rate,
  va.max_rate,
  va.team_size,
  va.english_level,
  va.japanese_support,
  va.plan_key,
  va.preferred_language,
  va.website_url,
  coalesce(va.public_contact_email, va.contact_email),
  va.public_contact_phone,
  false,
  null
from vendor_applications va
where not exists (
  select 1
  from vendor_profiles vp
  where vp.application_id = va.id
     or vp.owner_user_id = va.owner_user_id
);

update vendor_profiles vp
set
  company_name = va.company_name,
  country = va.country,
  contact_name = va.contact_name,
  summary = va.summary,
  services = coalesce(va.services, '{}'),
  portfolio_projects = coalesce(va.portfolio_projects, '[]'::jsonb),
  min_rate = va.min_rate,
  max_rate = va.max_rate,
  team_size = va.team_size,
  english_level = va.english_level,
  japanese_support = va.japanese_support,
  plan_key = va.plan_key,
  preferred_language = va.preferred_language,
  website_url = va.website_url,
  public_contact_email = coalesce(va.public_contact_email, va.contact_email),
  public_contact_phone = va.public_contact_phone
from vendor_applications va
where vp.application_id = va.id;

with listing_state as (
  select
    va.id as application_id,
    case
      when vba.status = 'active'
        and nullif(trim(coalesce(va.company_name, '')), '') is not null
        and nullif(trim(coalesce(va.country, '')), '') is not null
        and nullif(trim(coalesce(va.contact_name, '')), '') is not null
        and nullif(trim(coalesce(va.summary, '')), '') is not null
        and coalesce(array_length(va.services, 1), 0) > 0
        and coalesce(va.min_rate, 0) > 0
        and coalesce(va.max_rate, 0) >= coalesce(va.min_rate, 0)
        and coalesce(va.team_size, 0) > 0
      then true
      else false
    end as should_publish
  from vendor_applications va
  left join vendor_billing_accounts vba
    on vba.application_id = va.id
)
update vendor_profiles vp
set
  active = listing_state.should_publish,
  published_at = case
    when listing_state.should_publish then coalesce(vp.published_at, now())
    else null
  end
from listing_state
where vp.application_id = listing_state.application_id;

update vendor_applications va
set
  status = case
    when va.status = 'rejected' then 'rejected'
    when vp.active = true then 'approved'
    else 'draft'
  end,
  review_note = case
    when va.status = 'rejected' then va.review_note
    when vp.active = true then '決済と必須プロフィール入力が完了し、掲載中です。'
    else null
  end,
  reviewed_at = case when va.status = 'rejected' then va.reviewed_at else null end,
  reviewed_by = case when va.status = 'rejected' then va.reviewed_by else null end
from vendor_profiles vp
where vp.application_id = va.id;

update vendor_profiles
set published_at = coalesce(published_at, created_at, now())
where active = true
  and published_at is null;
