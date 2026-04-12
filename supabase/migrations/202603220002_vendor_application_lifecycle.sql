alter table vendor_applications
drop constraint if exists vendor_applications_status_check;

alter table vendor_applications
add constraint vendor_applications_status_check
check (status in ('draft', 'pending', 'changes_requested', 'approved', 'rejected'));

alter table vendor_applications
alter column status set default 'draft';

alter table vendor_applications
add column if not exists last_submitted_at timestamptz,
add column if not exists last_resubmitted_at timestamptz;

update vendor_applications
set status = case
  when status = 'pending' then 'pending'
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else 'draft'
end;

update vendor_applications
set last_submitted_at = coalesce(last_submitted_at, submitted_at)
where status in ('pending', 'approved', 'changes_requested', 'rejected');
