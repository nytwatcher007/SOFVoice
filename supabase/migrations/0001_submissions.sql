-- SoF Voice — 0001 submissions
--
-- Shape is dictated by CLAUDE.md lines 92-107. Read the invariants there before
-- changing anything in this file. In particular:
--   * there is no user_id / author_id / session_id column          (invariant 1)
--   * there is no ip / user_agent / fingerprint column             (invariant 3)
--   * there is no created_at timestamptz — date + 6h bucket only   (invariant 4)
-- Adding any of those is a build failure, not a review comment.

create extension if not exists "pgcrypto";

do $$ begin
  create type submission_kind as enum ('complaint', 'suggestion');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum
    ('new', 'reviewing', 'resolved', 'dismissed', 'escalated');
exception when duplicate_object then null; end $$;

create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  kind           submission_kind   not null,
  category       text              not null,
  subject        text              not null,
  body           text              not null,

  -- Optional identity. Permitted ONLY on suggestions, and only when the user
  -- explicitly toggled the reveal control (invariant 9). The check constraint
  -- below makes this a storage guarantee rather than a promise made in app code.
  name           text,
  contact        text,

  -- SHA-256 of the reference code. The plaintext is shown to the submitter once
  -- and never stored, so nobody — including the chairperson — can look a
  -- submission up by its code or recover a lost one (invariant 8).
  ref_hash       text              not null unique,

  status         submission_status not null default 'new',
  reply          text,

  -- Coarse time only. A millisecond timestamp would let anyone who knows when a
  -- meeting ended identify who submitted immediately afterwards (invariant 4).
  created_on     date              not null default (now() at time zone 'utc')::date,
  created_bucket smallint          not null default floor(extract(hour from (now() at time zone 'utc')) / 6),

  constraint submissions_bucket_range
    check (created_bucket between 0 and 3),

  -- Invariant 2, enforced by the database. Even a buggy route handler that
  -- forwards a client-supplied name cannot write one onto a complaint.
  constraint submissions_complaints_are_anonymous
    check (kind <> 'complaint' or (name is null and contact is null))
);

-- Sort order is (created_on, ref_hash). ref_hash is a SHA-256, so ordering
-- within a day is effectively random. That is deliberate: a stable ordinal
-- would reveal submission sequence. Do not add a tiebreaker column.
create index if not exists submissions_sort_idx
  on public.submissions (created_on desc, ref_hash);

create index if not exists submissions_status_idx
  on public.submissions (status);

-- Invariant 5: anon and authenticated get nothing. No policies are defined for
-- them, and RLS denies by default, but we revoke explicitly as well so the
-- intent survives someone later adding a permissive policy by accident.
alter table public.submissions enable row level security;
alter table public.submissions force row level security;

revoke all on public.submissions from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- All access is server-side, holding the service-role key.
grant all on public.submissions to service_role;
