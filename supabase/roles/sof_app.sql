-- SoF Voice — the application's database role
--
-- Applied by `npm run db:app-role`, which creates/rotates the password and then
-- runs this file. It is NOT in supabase/migrations/ because a role needs a
-- password, and passwords do not belong in version-controlled migration files.
--
-- WHY THIS EXISTS
--
-- The app previously connected as `postgres`: rolbypassrls=true,
-- rolcreaterole=true, with DELETE and TRUNCATE on submissions. A leaked
-- application credential could therefore drop every complaint in the school,
-- create itself new roles, and read past any future RLS policy.
--
-- Switching to the service-role key would NOT have helped -- service_role also
-- sets BYPASSRLS. That swaps one over-privileged identity for another.
--
-- At runtime the app only ever: inserts a submission, reads submissions, and
-- updates status/reply. That is all this role can do.

grant usage on schema public to sof_app;

-- Note the omissions: no DELETE, no TRUNCATE. Purging resolved entries at the
-- end of term is an administrative act run deliberately by a person, not
-- something the running web app should ever be able to do by accident or under
-- someone else's control.
grant select, insert, update on public.submissions to sof_app;

-- The app reads the admin allowlist to authorise dashboard access. Only an
-- administrator changes it.
grant select on public.admin_users to sof_app;

-- RLS is FORCEd on both tables and sof_app has no BYPASSRLS, so without
-- policies it would be denied everything. These are permissive today -- the app
-- legitimately needs every row -- but they exist so that any policy added later
-- actually binds the application instead of being silently bypassed.
drop policy if exists sof_app_select on public.submissions;
drop policy if exists sof_app_insert on public.submissions;
drop policy if exists sof_app_update on public.submissions;

create policy sof_app_select on public.submissions
  for select to sof_app using (true);
create policy sof_app_insert on public.submissions
  for insert to sof_app with check (true);
create policy sof_app_update on public.submissions
  for update to sof_app using (true) with check (true);

-- Deliberately no DELETE policy, to match the absent grant.

drop policy if exists sof_app_read_admins on public.admin_users;
create policy sof_app_read_admins on public.admin_users
  for select to sof_app using (true);
