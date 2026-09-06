/**
 * Submission suite (slice 3).
 *
 * The first suite that drives the REAL HTTP path — which is what the gate's
 * assertion 1 was always reaching for. test-anonymity.mts calls
 * createSubmission() directly; this posts to the route a browser posts to, then
 * reads the resulting row straight out of Postgres.
 *
 * Separate from test:anonymity, which CLAUDE.md line 172 forbids editing.
 * Needs `npm run dev` running.
 */
import pg from 'pg'
import { createHmac } from 'node:crypto'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const SECRET = process.env.SESSION_SECRET!

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

let failures = 0
const createdSubjects: string[] = []

function check(n: number, label: string, ok: boolean, detail = '') {
  if (ok) console.log(`  PASS  ${n}. ${label}`)
  else {
    failures++
    console.error(`  FAIL  ${n}. ${label}${detail ? `\n        ${detail}` : ''}`)
  }
}

// Mint a valid member cookie directly, so this suite doesn't depend on the
// access code being correct — that is test:gate's job.
function memberCookie(): string {
  const payload = { role: 'member', exp: Math.floor(Date.now() / 1000) + 600 }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', Buffer.from(SECRET, 'utf8'))
    .update(body)
    .digest('base64url')
  return `sof_gate=${body}.${sig}`
}

const post = (payload: unknown, cookie?: string) =>
  fetch(`${BASE}/api/complaint`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(payload),
  })

const rowBySubject = async (subject: string) =>
  (
    await client.query('select * from public.submissions where subject = $1', [
      subject,
    ])
  ).rows[0]

await client.connect()
console.log('\nSubmission (HTTP path)\n')

try {
  const cookie = memberCookie()

  // 1. No session -> 401, and nothing written.
  {
    const subject = 'PROBE unauthenticated'
    const res = await post(
      { category: 'Other', subject, body: 'x'.repeat(30) },
      undefined
    )
    const row = await rowBySubject(subject)
    check(
      1,
      'POST without a session is rejected and writes nothing',
      res.status === 401 && !row,
      `status=${res.status} rowWritten=${!!row}`
    )
  }

  // 2. THE ONE THAT MATTERS — inject name/contact, confirm NULL in the row.
  {
    const subject = 'PROBE injected identity'
    createdSubjects.push(subject)
    const res = await post(
      {
        category: 'Community & conduct',
        subject,
        body: 'Automated test row. Safe to delete. '.repeat(2),
        // Hostile payload: a client trying to attach identity to a complaint.
        name: 'Injected Name',
        contact: 'injected@example.com',
        revealName: true,
      },
      cookie
    )
    const data = await res.json().catch(() => ({}))
    const row = await rowBySubject(subject)
    check(
      2,
      'injected name/contact persist as NULL through the HTTP route',
      res.ok && !!row && row.name === null && row.contact === null,
      `status=${res.status} name=${JSON.stringify(row?.name)} contact=${JSON.stringify(row?.contact)}`
    )

    // 5. Plaintext code absent from the row; only the hash is stored.
    const serialized = JSON.stringify(row)
    check(
      5,
      'returned reference code is absent from the stored row',
      !!data.referenceCode &&
        !serialized.includes(data.referenceCode) &&
        !serialized.includes(String(data.referenceCode).replace('SV-', '')),
      `code=${data.referenceCode}`
    )
  }

  // 3. Category must be in the allowlist.
  {
    const subject = 'PROBE bad category'
    const res = await post(
      { category: 'Year 2 · Marketing track', subject, body: 'x'.repeat(30) },
      cookie
    )
    const row = await rowBySubject(subject)
    check(
      3,
      'category outside the allowlist is rejected',
      res.status === 400 && !row,
      `status=${res.status} rowWritten=${!!row}`
    )
  }

  // 4. Length limits enforced server-side.
  {
    const shortSubject = 'PROBE short body'
    const a = await post(
      { category: 'Other', subject: shortSubject, body: 'too short' },
      cookie
    )
    const b = await post(
      { category: 'Other', subject: 'ab', body: 'x'.repeat(30) },
      cookie
    )
    const row = await rowBySubject(shortSubject)
    check(
      4,
      'subject/body length limits enforced server-side',
      a.status === 400 && b.status === 400 && !row,
      `body=${a.status} subject=${b.status}`
    )
  }

  // 6. Codes are unique per submission (catches a stubbed generator).
  {
    const s1 = 'PROBE uniqueness 1'
    const s2 = 'PROBE uniqueness 2'
    createdSubjects.push(s1, s2)
    const r1 = await post(
      { category: 'Other', subject: s1, body: 'x'.repeat(30) },
      cookie
    )
    const r2 = await post(
      { category: 'Other', subject: s2, body: 'x'.repeat(30) },
      cookie
    )
    const d1 = await r1.json()
    const d2 = await r2.json()
    check(
      6,
      'each submission gets a distinct reference code',
      !!d1.referenceCode && !!d2.referenceCode && d1.referenceCode !== d2.referenceCode,
      `${d1.referenceCode} vs ${d2.referenceCode}`
    )
  }
  // ---------------------------------------------------------------------------
  // Suggestions (slice 4). The reveal toggle is the ONLY route by which identity
  // is permitted to reach storage, so each branch of it is tested.
  // ---------------------------------------------------------------------------
  const postSuggestion = (payload: unknown, cookieValue?: string) =>
    fetch(`${BASE}/api/suggestion`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookieValue ? { cookie: cookieValue } : {}),
      },
      body: JSON.stringify(payload),
    })

  // 7. Reveal OFF but name/contact supplied anyway -> both discarded.
  {
    const subject = 'PROBE suggestion reveal off'
    createdSubjects.push(subject)
    const res = await postSuggestion(
      {
        category: 'Other',
        subject,
        body: 'x'.repeat(30),
        revealName: false,
        name: 'Should Be Discarded',
        contact: 'discard@example.com',
      },
      cookie
    )
    const row = await rowBySubject(subject)
    check(
      7,
      'reveal off discards a supplied name and contact',
      res.ok && !!row && row.name === null && row.contact === null,
      `status=${res.status} name=${JSON.stringify(row?.name)}`
    )
  }

  // 8. Reveal ON with a name -> stored. This is the one permitted case.
  {
    const subject = 'PROBE suggestion reveal on'
    createdSubjects.push(subject)
    const res = await postSuggestion(
      {
        category: 'Other',
        subject,
        body: 'x'.repeat(30),
        revealName: true,
        name: 'Named Submitter',
        contact: 'named@example.com',
      },
      cookie
    )
    const row = await rowBySubject(subject)
    check(
      8,
      'reveal on stores the name the user chose to give',
      res.ok && row?.name === 'Named Submitter' && row?.contact === 'named@example.com',
      `status=${res.status} name=${JSON.stringify(row?.name)}`
    )
  }

  // 9. Reveal ON with a blank name -> rejected, not silently anonymous.
  {
    const subject = 'PROBE suggestion reveal blank'
    const res = await postSuggestion(
      { category: 'Other', subject, body: 'x'.repeat(30), revealName: true, name: '   ' },
      cookie
    )
    const row = await rowBySubject(subject)
    check(
      9,
      'reveal on with a blank name is rejected rather than stored anonymously',
      res.status === 400 && !row,
      `status=${res.status} rowWritten=${!!row}`
    )
  }

  // 10. revealName absent entirely -> defaults to anonymous.
  {
    const subject = 'PROBE suggestion default'
    createdSubjects.push(subject)
    const res = await postSuggestion(
      { category: 'Other', subject, body: 'x'.repeat(30), name: 'Sneaky' },
      cookie
    )
    const row = await rowBySubject(subject)
    check(
      10,
      'omitting revealName defaults to anonymous',
      res.ok && !!row && row.name === null,
      `status=${res.status} name=${JSON.stringify(row?.name)}`
    )
  }

  // 11. A complaint can never be published to the public board.
  {
    const subject = 'PROBE publish complaint'
    createdSubjects.push(subject)
    await post({ category: 'Other', subject, body: 'x'.repeat(30) }, cookie)
    let rejected = false
    let detail = 'UPDATE unexpectedly succeeded'
    try {
      await client.query(
        'update public.submissions set published = true where subject = $1',
        [subject]
      )
    } catch (e) {
      // 23514 = check_violation
      rejected = (e as { code?: string }).code === '23514'
      detail = `code=${(e as { code?: string }).code}`
    }
    check(
      11,
      'the database refuses to publish a complaint to the board',
      rejected,
      detail
    )
  }
} finally {
  if (createdSubjects.length) {
    await client.query(
      'delete from public.submissions where subject = any($1::text[])',
      [createdSubjects]
    )
    console.log('\n  (probe rows deleted)')
  }
  await client.end()
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll assertions passed.\n')
process.exit(failures ? 1 : 0)
