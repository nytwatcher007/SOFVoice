-- SoF Voice — 0002 suggestion board storage
--
-- Adds the columns the public suggestion board will need. The board UI itself
-- lands in a later slice, after the dashboard exists to moderate it: publishing
-- anonymous content to a small cohort unreviewed means an identifying or
-- abusive post is live before anyone has read it.

alter table public.submissions
  add column if not exists published boolean not null default false;

alter table public.submissions
  add column if not exists upvotes integer not null default 0;

do $$ begin
  alter table public.submissions
    add constraint submissions_upvotes_non_negative check (upvotes >= 0);
exception when duplicate_object then null; end $$;

-- A complaint must never appear on a public board. Enforced here rather than by
-- remembering to filter correctly in every query -- same instinct as
-- submissions_complaints_are_anonymous.
do $$ begin
  alter table public.submissions
    add constraint submissions_only_suggestions_published
      check (not published or kind = 'suggestion');
exception when duplicate_object then null; end $$;

-- Board ordering. Deliberately (upvotes, ref_hash) and never insertion order.
create index if not exists submissions_board_idx
  on public.submissions (published, upvotes desc, ref_hash)
  where published;

-- NOTE: there is deliberately no votes table and no voter id.
--
-- Upvote dedupe cannot use accounts because there are none. A
-- votes(submission_id, voter_id) table would be exactly the identity anchor
-- invariant 1 forbids, and a voter id that also appeared on a submission would
-- become a correlation handle. Dedupe is therefore client-side only, and the UI
-- must present these counts as "interest" rather than an exact tally.
