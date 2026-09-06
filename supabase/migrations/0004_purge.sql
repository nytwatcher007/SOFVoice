-- SoF Voice — 0004 term-end purge
--
-- CLAUDE.md: "Resolved and dismissed entries purge automatically at the end of
-- the council term." Complaints hold no personal data, but suggestions with the
-- reveal toggle do, and not keeping personal data forever is the cleanest DPDP
-- posture available.
--
-- Runs INSIDE the database via pg_cron. That matters: the application role
-- sof_app deliberately has no DELETE (slice 7), and DATABASE_ADMIN_URL must
-- never exist in production. A scheduled job inside Postgres is the only way to
-- be genuinely automatic without putting a deleting credential in the deployed
-- app.

create extension if not exists pg_cron;

-- When an entry was closed. Retention counts from here, not from created_on --
-- otherwise something submitted 200 days ago and resolved yesterday would be
-- deleted immediately, taking a reply the submitter may never have read.
--
-- Date only, no time. Same granularity as created_on, for the same reason
-- (invariant 4): a precise timestamp plus a small cohort is how an anonymous
-- submission gets attributed.
alter table public.submissions
  add column if not exists resolved_on date;

-- Backfill so existing closed entries have a sane starting point.
update public.submissions
   set resolved_on = created_on
 where resolved_on is null
   and status in ('resolved', 'dismissed');

-- Maintain it automatically, so no route handler has to remember.
create or replace function public.set_resolved_on()
returns trigger language plpgsql as $$
begin
  if new.status in ('resolved', 'dismissed') then
    if old.status not in ('resolved', 'dismissed') or new.resolved_on is null then
      new.resolved_on := (now() at time zone 'utc')::date;
    end if;
  else
    -- Reopened: clear it, so the retention clock restarts if it closes again.
    new.resolved_on := null;
  end if;
  return new;
end $$;

drop trigger if exists submissions_set_resolved_on on public.submissions;
create trigger submissions_set_resolved_on
  before update on public.submissions
  for each row execute function public.set_resolved_on();

-- The purge itself.
--
-- ESCALATED IS NEVER PURGED. Those concern harm to a person and may be needed
-- if something is investigated later. Deleting them to tidy the database would
-- destroy the record of the most serious thing this portal handles.
--
-- `new` and `reviewing` are untouched too: they are still open, and silently
-- deleting a complaint nobody got round to is the opposite of accountability.
create or replace function public.purge_expired_submissions(retention_days integer default 180)
returns integer language plpgsql as $$
declare
  deleted integer;
begin
  delete from public.submissions
   where status in ('resolved', 'dismissed')
     and resolved_on is not null
     and resolved_on < ((now() at time zone 'utc')::date - retention_days);
  get diagnostics deleted = row_count;
  return deleted;
end $$;

-- CRITICAL: sof_app must not be able to call this.
--
-- Slice 7 removed DELETE from the application role. A function that deletes,
-- callable by that role, would hand the capability straight back -- and
-- functions are EXECUTE-able by PUBLIC by default, so this revoke is doing real
-- work rather than restating a default.
revoke all on function public.purge_expired_submissions(integer) from public;
revoke all on function public.purge_expired_submissions(integer) from sof_app, anon, authenticated;
revoke all on function public.set_resolved_on() from public;

-- 03:00 UTC on the 1st of each month. Entries only become eligible 180 days
-- after closure, so the schedule is just a sweep, not a deadline.
select cron.unschedule('sof-voice-purge')
 where exists (select 1 from cron.job where jobname = 'sof-voice-purge');

select cron.schedule(
  'sof-voice-purge',
  '0 3 1 * *',
  $$select public.purge_expired_submissions(180)$$
);
