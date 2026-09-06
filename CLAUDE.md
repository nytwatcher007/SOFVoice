# SoF Voice — CLAUDE.md

Anonymous accountability & suggestions portal for The School of Future, Kochi.
Student council project. Closed circuit: students + faculty only.

## The one thing that must never break

**Gate the door, never tag the person.**

A complaint must not be traceable to its author by anyone — including the
chairperson, including someone with full database access, including someone
with platform log access.

This is a product promise made in a public manifesto. Every other feature is
negotiable. This is not.

## Hard invariants

Violating any of these is a build failure, not a code-review comment.

1. **No `user_id`, `author_id`, `session_id`, or any identity column on
   `submissions`.** If a task seems to need one, the task is wrong. Stop and
   ask.
2. **Complaints force `name` and `contact` to `NULL` server-side**, regardless
   of what the request body contains. Never trust the client to omit them.
3. **No IP address, user-agent, device fingerprint, or session token is ever
   written to the database**, in any table, including logs and audit tables.
4. **`submissions.created_at` stores a date + coarse bucket only** (see schema).
   Never a millisecond timestamp. Never expose ordinal insert order to admins.
5. **The Supabase `anon` and `authenticated` roles have zero privileges on
   `submissions`.** All reads and writes go through server-side code holding the
   service-role key.
6. **The service-role key never reaches the browser.** It exists only in
   `process.env` inside route handlers / server actions. Never in a client
   component, never in `NEXT_PUBLIC_*`.
7. **Access codes are compared server-side only.** No code, hash, or salt is
   ever sent to the client.
8. **Reference codes are stored hashed** (SHA-256). The plaintext code is
   returned to the submitter once, at submission time, and never again.
9. **Suggestions may carry a name only when the user explicitly toggled the
   reveal control.** Default is off. There is no "remember me".
10. **Do not change the design tokens.** They are extracted from
    theschooloffuture.com and are fixed.

## Design tokens (fixed)

```
--sof-orange:    #ff600b   /* primary */
--sof-espresso:  #180b05   /* background */
--sof-cream:     #f9f4eb   /* text on dark */
--sof-amber:     #ffb917   /* accent */
font-family:     'Plus Jakarta Sans'
```

**Verified 2026-09-06** against the live Webflow stylesheet
`sofuture.webflow.shared.56e41c6ef.min.css`. All four hex values are correct and
are the site's dominant colours (`#ff600b` × 29, `#180b05` × 23, `#ffb917` × 5,
`#f9f4eb` × 4). No correction needed.

**Typography is more than one face.** The live site pairs Plus Jakarta Sans
(× 164, body/UI) with **Polysans** Neutral/Median/Slim (× 89+, display and
headings). Polysans is a commercial Wildtype licence and is *not* redistributable
from the site's CDN. We therefore use Plus Jakarta Sans throughout, including
headings — a deliberate, licence-driven divergence from the live site, not an
oversight. Do not scrape or embed Polysans.

Official logo SVGs, downloaded from the live site:

- nav: `.../69382e2f65d6d211d3281743_SOF - White Navbar logo.svg`
- footer: `.../68f7abdf63e174cce3c549b2_footer-brand-logo.svg`

both under `https://cdn.prod.website-files.com/68e655078fcbd111e63ac4af/`.

Save them to `public/`. Do not recolour, redraw, or regenerate them, and never
let an agent produce a substitute logo.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase Postgres (database only — not Supabase Auth for submitters)
- Vercel hosting
- No Supabase Edge Functions. Privileged logic lives in Next.js route handlers.

## Auth model — asymmetric, on purpose

| | Submitters (students + faculty) | Admins (chairperson + safeguarding lead) |
|---|---|---|
| Mechanism | Shared access code | Supabase Auth, email + password + MFA |
| Accounts | None | Real accounts |
| Identity stored | None, ever | Yes — admin identity is not secret |
| Revocation | Rotate the code each term | Per-account, immediate |

Submitter anonymity requires there to be no account to link to. Admin
accountability requires the opposite. Do not unify these.

## Schema notes

`submissions`:
- `id` uuid
- `kind` enum: `complaint` | `suggestion`
- `category` text
- `subject` text
- `body` text
- `name` text — **always NULL when kind = 'complaint'**
- `contact` text — **always NULL when kind = 'complaint'**
- `ref_hash` text — SHA-256 of the reference code, unique
- `status` enum: `new` | `reviewing` | `resolved` | `dismissed` | `escalated`
- `reply` text
- `created_on` date
- `created_bucket` smallint — 0–3, six-hour bucket

There is no `created_at timestamptz`. Do not add one "for sorting". Sorting is
by `created_on` then `ref_hash`.

## Known gaps — found in slice 1, not yet closed

Recorded here rather than fixed mid-slice (see Build discipline). Both are real,
both were confirmed empirically, and neither is closed by the current gate.

### 1. Physical row order still reveals submission sequence

Invariant 4 removes `created_at` so that submission *order* cannot be recovered.
It can be anyway: `select ctid from submissions order by ctid` returns exact
insertion order. Verified 2026-09-06 — three probe rows came back `(0,3) (0,4)
(0,5)` in insertion order. `id` is a v4 UUID and is safe; `ctid` is not.

This is reachable by anyone with direct SQL access — which includes the
chairperson via the Supabase dashboard, not just an attacker.

Candidate fix: `cluster submissions using submissions_sort_idx` physically
reorders rows into `(created_on desc, ref_hash)` — i.e. random within a day —
destroying insertion order. Needs to run on a schedule. Fold into the term-end
purge slice, and note that `vacuum full` alone does **not** randomise.

### 2. The app's database identity is broader than this document says

Invariants 5 and 6 describe access via the **service-role key**. The
implementation instead connects as the `postgres` role over `DATABASE_URL`.
Measured: `rolsuper=false`, `rolbypassrls=true`, `rolcreaterole=true`.

So it is not a superuser, and it bypasses RLS exactly as `service_role` does —
but it can also create roles, which `service_role` cannot. `SUPABASE_SERVICE_ROLE_KEY`
is currently unused.

Decide before the admin slice: either move data access to `supabase-js` with the
service-role key as written here, or amend invariants 5/6 to name the `postgres`
role deliberately. Do not leave the spec and the code disagreeing.

## Cohort size is the dominant risk

SOF runs a single small, curated cohort. With a population this size, schema
anonymity is not enough — a complaint's category, subject, and phrasing can
identify its author to anyone who knows the room, no matter what the database
stores.

Design consequences:

- The complaint form carries a plain warning about this, above the body field,
  not buried in a footer.
- The dashboard never displays category counts, submission volume over time, or
  anything else that lets an admin narrow a pool.
- Categories stay broad. No `year`, `cohort`, `track`, or `department` field —
  those are identity by another name.

## Escalation path

An anonymous channel will eventually receive a disclosure of harassment or
serious misconduct, possibly naming a mentor, staff member, or founder. The
portal must handle that rather than pretend it won't.

- Every form shows a persistent notice: if this concerns harm to a person, the
  named channel — with the actual named contact — can actually be followed up,
  and an anonymous report cannot.
- The dashboard has an `escalated` status that hands the entry to a designated
  non-council contact.
- A student chairperson is not the sole reader of escalated entries.

Do not remove or soften these. They are not decoration.

## Data protection (DPDP Act)

Complaints collect no personal data — that is the whole point and it is also the
cleanest possible compliance posture. Suggestions with the reveal toggle do
collect personal data.

- Keep the optional fields to name + one contact. Do not add more.
- A short plain-language notice sits next to the reveal toggle.
- Resolved and dismissed entries purge automatically at the end of the council
  term.

## Build discipline

- Plan mode before every slice. Present the plan; wait for approval.
- One slice, one branch, one review.
- Propose architecture changes before implementing them. Never mid-slice.
- A slice is not done until it has been observed working in a real browser.
  Tracing the code path is not evidence.

## Non-negotiable test gate

`npm run test:anonymity` must pass before any commit. It asserts, against a real
database row:

1. A complaint POST with `name` and `contact` deliberately injected into the
   body persists both as `NULL`.
2. No column on `submissions` contains an IP, user-agent, or session value.
3. The `anon` role receives a permission error on `SELECT * FROM submissions`.
4. The reference code returned to the submitter is absent from the row —
   only its hash is stored.
5. A member-level session receives 401/403 on every `/api/admin/*` route.

If a change makes this suite fail, the change is wrong. Do not edit the suite to
make it pass.
