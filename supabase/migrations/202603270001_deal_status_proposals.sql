alter table messages
add column if not exists message_type text not null default 'text';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_message_type_check'
  ) then
    alter table messages
    add constraint messages_message_type_check
    check (message_type in ('text', 'system'));
  end if;
end
$$;

alter table deal_records
add column if not exists proposed_status text,
add column if not exists proposed_by_role text,
add column if not exists proposal_created_at timestamptz,
add column if not exists status_locked_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deal_records_proposed_status_check'
  ) then
    alter table deal_records
    add constraint deal_records_proposed_status_check
    check (proposed_status is null or proposed_status in ('相談中', '進行中', '完了'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deal_records_proposed_by_role_check'
  ) then
    alter table deal_records
    add constraint deal_records_proposed_by_role_check
    check (proposed_by_role is null or proposed_by_role in ('buyer', 'vendor'));
  end if;
end
$$;

update deal_records
set status_locked_at = coalesce(status_locked_at, updated_at)
where status = '完了'
  and status_locked_at is null;

create index if not exists idx_deal_records_status_locked_at
on deal_records(status, status_locked_at desc);
