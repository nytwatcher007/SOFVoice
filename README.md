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
- [ ] **Set real access codes.** `MEMBER_ACCESS_CODE` / `ADMIN_ACCESS_CODE` in
      `.env.local`. Do **not** reuse `SOF-VOICE-2026` / `CHAIR-2026` — those
      appeared in a PDF that has been shared around.
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

**Slice 1 (done):** schema + RLS + anonymity gate + design shell.
Routes `/complaint`, `/suggestion`, `/track` are placeholders.

**Next:** access-code gate → complaint form → suggestion form → track by
reference → admin auth + dashboard → term-end purge.
