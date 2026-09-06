-- SoF Voice — 0003 admin allowlist
--
-- The asymmetry in CLAUDE.md lines 78-88 made concrete:
--
--   submitters  -> shared access code, NO account, NO identity stored, ever
--   admins      -> real Supabase Auth accounts, identity deliberately recorded
--
-- Submitter anonymity requires there to be no account to link a complaint to.
-- Admin accountability requires the opposite: you must be able to say who
-- dismissed a complaint. These must never be unified.
--
-- Being an authenticated Supabase user is NOT sufficient to reach the
-- dashboard. A row here is required, so revocation is deleting one row and
-- takes effect immediately -- not a redeploy.

create table if not exists public.admin_users (
  user_id  uuid primary key,          -- auth.users.id
  email    text not null unique,
  label    text,                      -- e.g. 'Chairperson', 'Safeguarding lead'
  added_on date not null default (now() at time zone 'utc')::date
);

-- Same posture as submissions: nothing reachable by anon or authenticated.
-- All access is server-side through privileged code.
alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;

revoke all on public.admin_users from anon, authenticated;
grant all on public.admin_users to service_role;
