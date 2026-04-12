alter table vendor_profiles
add column if not exists flagged_at timestamptz,
add column if not exists flag_reason text,
add column if not exists deactivated_at timestamptz,
add column if not exists deactivation_reason text,
add column if not exists removed_at timestamptz,
add column if not exists removed_reason text;
