alter table vendor_profiles
  add column if not exists listing_score_plan integer not null default 0,
  add column if not exists listing_score_profile integer not null default 0,
  add column if not exists listing_score_portfolio integer not null default 0,
  add column if not exists listing_score_completed_projects integer not null default 0,
  add column if not exists listing_score_new_vendor_boost integer not null default 0,
  add column if not exists listing_completed_projects_count integer not null default 0,
  add column if not exists listing_score_total integer not null default 0,
  add column if not exists listing_score_updated_at timestamptz;

create index if not exists idx_vendor_profiles_listing_score_total
  on vendor_profiles (active, listing_score_total desc, created_at desc);

with completed_projects as (
  select
    mt.vendor_profile_id,
    count(*)::integer as completed_count
  from deal_records dr
  join message_threads mt
    on mt.id = dr.thread_id
  where dr.status = '完了'
    and dr.status_locked_at is not null
  group by mt.vendor_profile_id
),
scored as (
  select
    vp.id,
    case when coalesce(vba.plan_key, vp.plan_key) = 'translation' then 20 else 10 end as plan_score,
    (
      case when nullif(trim(coalesce(vp.summary, '')), '') is not null then 8 else 0 end +
      case when coalesce(array_length(vp.services, 1), 0) > 0 then 8 else 0 end +
      case when coalesce(vp.min_rate, 0) > 0 and coalesce(vp.max_rate, 0) >= coalesce(vp.min_rate, 0) then 6 else 0 end +
      case when coalesce(vp.team_size, 0) > 0 then 4 else 0 end +
      case when nullif(trim(coalesce(vp.contact_name, '')), '') is not null then 4 else 0 end
    ) as profile_score,
    case
      when coalesce(jsonb_array_length(vp.portfolio_projects), 0) >= 5 then 20
      when coalesce(jsonb_array_length(vp.portfolio_projects), 0) = 4 then 17
      when coalesce(jsonb_array_length(vp.portfolio_projects), 0) = 3 then 14
      when coalesce(jsonb_array_length(vp.portfolio_projects), 0) = 2 then 10
      when coalesce(jsonb_array_length(vp.portfolio_projects), 0) = 1 then 6
      else 0
    end as portfolio_score,
    coalesce(cp.completed_count, 0) as completed_count,
    case
      when coalesce(cp.completed_count, 0) >= 5 then 30
      when coalesce(cp.completed_count, 0) = 4 then 25
      when coalesce(cp.completed_count, 0) = 3 then 21
      when coalesce(cp.completed_count, 0) = 2 then 16
      when coalesce(cp.completed_count, 0) = 1 then 10
      else 0
    end as completed_projects_score,
    case
      when coalesce(vp.created_at, now()) >= now() - interval '14 days' then 12
      else 0
    end as new_vendor_boost_score
  from vendor_profiles vp
  left join vendor_billing_accounts vba
    on vba.company_id = vp.id
  left join completed_projects cp
    on cp.vendor_profile_id = vp.id
)
update vendor_profiles vp
set
  listing_score_plan = scored.plan_score,
  listing_score_profile = scored.profile_score,
  listing_score_portfolio = scored.portfolio_score,
  listing_completed_projects_count = scored.completed_count,
  listing_score_completed_projects = scored.completed_projects_score,
  listing_score_new_vendor_boost = scored.new_vendor_boost_score,
  listing_score_total = scored.plan_score + scored.profile_score + scored.portfolio_score + scored.completed_projects_score + scored.new_vendor_boost_score,
  listing_score_updated_at = now()
from scored
where vp.id = scored.id;
