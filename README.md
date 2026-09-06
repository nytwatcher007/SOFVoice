# SoF Voice

Anonymous accountability & suggestions portal for The School of Future, Kochi.
Run by the SoF Kochi student council.

Read [`CLAUDE.md`](./CLAUDE.md) before changing anything. It defines invariants
that are build failures, not review comments.

## Launch blockers

These must be cleared before the portal accepts a real submission.

- [ ] **Rotate the database password.** Supabase → Settings → Database → Reset
      database password. The current one was pasted into a chat transcript on
      2026-09-06.
- [ ] **Rotate the service-role key.** Same reason. Supabase → Settings → API.
- [ ] **Set the escalation contact.** `src/lib/escalation.ts` currently holds
      `ESCALATION_CONTACT_UNSET`, which renders a visible LAUNCH BLOCKER banner
      on every form. It must name a real person **outside the student council**
      who can act on a disclosure of harm — a programme director, faculty lead,
      or the institution's grievance officer. See `CLAUDE.md` lines 125-138.
- [ ] **Set a fresh access code and session secret.** `npm run gen:code`, then
      paste both into `.env.local` and into the Vercel project's environment
      variables. Do **not** reuse `SOF-VOICE-2026` — it appeared in a PDF that
      has been shared around. The development values currently in `.env.local`
      should be regarded as burnt.
- [ ] **Check what the host logs.** The database stores no IP and no precise
      time, but Vercel's request logs record client IP against request
      timestamp. With a cohort this small, matching a log entry to the only
      submission in a 6-hour bucket deanonymizes it — the database being clean
      does not save you. Before launch: confirm Vercel's log retention period,
      turn off any log drains, and satisfy yourself the exposure is acceptable.
      This is a hosting decision, not something the code can fix.
- [ ] **Decide who may run raw SQL against production.** Submission order is
      recoverable from Postgres system columns (`ctid`, `xmin`) and **no schema
      change can prevent it** — tested, `CLUSTER` does not work. If the
      chairperson keeps Supabase dashboard access, the anonymity promise is
      weaker than what the cohort would be told. See "Known gaps" in
      `CLAUDE.md`.
- [ ] **Add the honest guarantee statement to the UI.** What the portal can and
      cannot promise, next to the submit action — not an absolute claim.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run db:migrate
npm run test:anonymity
npm run dev
```

### Connecting to the database

Use the Supabase **session pooler** connection string (IPv4, port 5432, user
`postgres.<project-ref>`). The direct host `db.<ref>.supabase.co` is **IPv6-only**
and is unreachable from many networks including this one — if `DATABASE_URL`
suddenly stops working, check that it hasn't been swapped back to the direct host.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build + typecheck |
| `npm run lint` | ESLint |
| `npm run db:check` | Prints connection identity and public tables |
| `npm run db:migrate` | Applies `supabase/migrations/*.sql`, tracked in `_migrations` |
| `npm run test:anonymity` | **The gate.** Must pass before any commit. |
| `npm run test:gate` | Access-gate suite. Needs `npm run dev` running. |
| `npm run test:submission` | Complaint HTTP path. Needs `npm run dev` running. |
| `npm run gen:code` | Prints a fresh access code + session secret |

## The access gate

Closed circuit: one shared code for students and faculty, no accounts. There is
no identity for a submission to be linked to — that is the whole design.

Enforcement is **two layers, deliberately**:

1. `src/proxy.ts` — optimistic cookie-*presence* check, for redirect UX only.
   Next 16 renamed `middleware.ts` to `proxy.ts`, and its docs state it
   "should not be used as a full session management or authorization solution".
2. `requireMember()` in `src/lib/session.ts` — the real check, called inside
   every protected page and route handler.

Do not move authorization into the proxy. The forgery test (`test:gate` #5)
passes precisely because layer 2 catches what layer 1 waves through.

The session cookie carries **a role and an expiry, signed with HMAC-SHA256**.
No name, no user id, and no session table — a session row would be exactly the
identity anchor invariant 1 forbids.

## The anonymity gate

`npm run test:anonymity` asserts, against a real database row:

1. A complaint with `name`/`contact` deliberately injected persists both as `NULL`.
2. No IP, user-agent, session, or identity column exists on `submissions`.
3. The `anon` role gets SQLSTATE `42501` on `SELECT * FROM submissions`.
4. Only the SHA-256 of the reference code is stored; the plaintext is absent.
5. Every `/api/admin/*` route rejects a member-level session.

Assertion 5 currently passes **vacuously** — no admin routes exist yet. It
enumerates the route tree at runtime, so it gains real coverage automatically
when the admin slice lands, without the suite being edited.

If a change makes this suite fail, the change is wrong. Do not edit the suite to
make it pass.

## Design

Brand tokens verified 2026-09-06 against the live Webflow stylesheet
`sofuture.webflow.shared.56e41c6ef.min.css`:
`#ff600b` orange, `#180b05` espresso, `#f9f4eb` cream, `#ffb917` amber.

Logos in `public/` are the **official** SVGs downloaded from the live site
(`sof-logo-nav.svg` was `69382e2f65d6d211d3281743_SOF - White Navbar logo.svg`;
`sof-logo-footer.svg` was `68f7abdf63e174cce3c549b2_footer-brand-logo.svg`).
Renamed for URL sanity, otherwise untouched. Never substitute a generated logo.

The live site uses **Polysans** for display type. It is a commercial Wildtype
licence and is not redistributable, so Plus Jakarta Sans carries headings here
too. This is deliberate — do not "fix" it by embedding Polysans.

## Build status

**Slice 1:** schema + RLS + anonymity gate + design shell.
**Slice 2:** closed-circuit access gate.
**Slice 3:** anonymous complaint form.
**Slice 4:** suggestion form with the reveal toggle.
**Slice 5:** track by reference.

The whole submitter journey now works end to end: enter → submit → get a code →
check status and read replies.

**Next:** admin auth + dashboard → public suggestion board → term-end purge.

### Why `/api/track` is POST and not GET

A `GET /api/track?code=SV-3KQ7WM2A` would put the reference code in the **URL**,
and URLs land in Vercel's request logs, browser history, and any proxy between.
We already accept that the host logs client IP against request time (see launch
blockers above). Putting the code in the URL too would mean those logs contain
**IP + timestamp + the key to a specific submission** — the exact
deanonymisation path the schema exists to prevent, handed over in a query
string.

For the same reason there is no shareable track URL and no code in the path.

The track response also deliberately omits the submission **body**. Anyone
holding a code can open that page, and a code can be shoulder-surfed or left on
a shared campus machine. The submitter already knows what they wrote; a finder
gets a subject line rather than the whole account — which, in a small cohort, is
the most identifying part.

### The public suggestion board is deferred, on purpose

Migration `0002` adds `published` and `upvotes`, but there is no board UI yet
and **no votes table**. Two reasons:

1. **Upvote dedupe cannot use accounts, because there are none.** A
   `votes(submission_id, voter_id)` table is precisely the identity anchor
   invariant 1 forbids, and a voter id that also appeared on a submission would
   become a correlation handle. Dedupe will be client-side only, so counts are
   *interest*, not an exact tally, and the UI must say so.
2. **Publishing needs moderation**, and moderation lives in the dashboard.
   Publishing anonymous content to a small cohort unreviewed means an
   identifying or abusive post is live before anyone has read it.

A `check (not published or kind = 'suggestion')` constraint means a complaint
can never reach the board, enforced by the database rather than by remembering
to filter.

### Why complaints are anonymous three times over

Belt, braces, and a third belt — because this is the one promise that cannot
break:

1. `src/app/api/complaint/route.ts` never reads `name`/`contact` off the request.
2. `sanitizeIdentity()` in `src/lib/submissions.ts` nulls them regardless.
3. The `submissions_complaints_are_anonymous` CHECK constraint refuses the row
   outright if the first two ever fail.

`npm run test:submission` proves it end-to-end: it POSTs a complaint with a name
and contact deliberately injected, then reads the raw row back out of Postgres
and asserts both are `NULL`.
