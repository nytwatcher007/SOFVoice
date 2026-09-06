/**
 * Public suggestion board suite (slice 8).
 *
 * The board is the only place submissions are shown to people other than their
 * author and the council, so the things that must not leak are tested directly
 * against the HTTP responses rather than the query.
 *
 * Needs `npm run dev` running.
 */
import pg from 'pg'
import { createHmac } from 'node:crypto'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const SECRET = process.env.SESSION_SECRET!

const client = new pg.Client({
  connectionString: process.env.DATABASE_ADMIN_URL,
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

function memberCookie(): string {
  const payload = { role: 'member', exp: Math.floor(Date.now() / 1000) + 600 }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', Buffer.from(SECRET, 'utf8'))
    .update(body)
    .digest('base64url')
  return `sof_gate=${body}.${sig}`
}

await client.connect()
console.log('\nSuggestion board\n')

try {
  const cookie = memberCookie()

  // Seed: a published suggestion that carries a name, and a complaint.
  const namedSubject = 'PROBE board named suggestion'
  const complaintSubject = 'PROBE board complaint'
  createdSubjects.push(namedSubject, complaintSubject)

  const seeded = await client.query(
    `insert into public.submissions
       (kind, category, subject, body, name, contact, ref_hash, published)
     values ('suggestion','Other',$1,'Board probe body.',
             'Publicly Identifiable Person','person@example.com','probe_board_1', true)
     returning id`,
    [namedSubject]
  )
  const suggestionId = seeded.rows[0].id

  await client.query(
    `insert into public.submissions (kind, category, subject, body, ref_hash)
     values ('complaint','Other',$1,'Complaint probe body.','probe_board_2')`,
    [complaintSubject]
  )

  // 1. Board requires a session.
  {
    const res = await fetch(`${BASE}/board`, { redirect: 'manual' })
    check(
      1,
      'the board is behind the access gate',
      res.status !== 200,
      `status=${res.status}`
    )
  }

  // 2. THE CONSENT ASSERTION — a name given to the council must not appear on
  //    the public board, because that consent was for the council only.
  {
    const res = await fetch(`${BASE}/board`, { headers: { cookie } })
    const html = await res.text()
    const showsSubject = html.includes(namedSubject)
    const leaksName = html.includes('Publicly Identifiable Person')
    const leaksContact = html.includes('person@example.com')
    check(
      2,
      'a revealed name is NOT shown on the public board',
      showsSubject && !leaksName && !leaksContact,
      `subjectShown=${showsSubject} nameLeaked=${leaksName} contactLeaked=${leaksContact}`
    )
  }

  // 3. Complaints never appear on the board, published or not.
  {
    const res = await fetch(`${BASE}/board`, { headers: { cookie } })
    const html = await res.text()
    check(
      3,
      'complaints do not appear on the board',
      !html.includes(complaintSubject),
      'complaint subject found in board HTML'
    )
  }

  // 4. Interest requires a session.
  {
    const res = await fetch(`${BASE}/api/board/${suggestionId}`, {
      method: 'POST',
      redirect: 'manual',
    })
    check(4, 'registering interest requires a session', res.status === 401, `status=${res.status}`)
  }

  // 5. Interest increments.
  {
    const before = (
      await client.query('select upvotes from public.submissions where id = $1', [
        suggestionId,
      ])
    ).rows[0].upvotes
    const res = await fetch(`${BASE}/api/board/${suggestionId}`, {
      method: 'POST',
      headers: { cookie },
    })
    const data = await res.json().catch(() => ({}))
    const after = (
      await client.query('select upvotes from public.submissions where id = $1', [
        suggestionId,
      ])
    ).rows[0].upvotes
    check(
      5,
      'registering interest increments the count',
      res.ok && after === before + 1 && data.upvotes === after,
      `before=${before} after=${after} returned=${data.upvotes}`
    )
  }

  // 6. An unpublished suggestion cannot be starred, and answers identically to
  //    a nonexistent one so the endpoint cannot probe for unpublished rows.
  {
    const hidden = await client.query(
      `insert into public.submissions (kind, category, subject, body, ref_hash, published)
       values ('suggestion','Other','PROBE board unpublished','x','probe_board_3', false)
       returning id`
    )
    createdSubjects.push('PROBE board unpublished')

    const hiddenRes = await fetch(`${BASE}/api/board/${hidden.rows[0].id}`, {
      method: 'POST',
      headers: { cookie },
    })
    const missingRes = await fetch(
      `${BASE}/api/board/00000000-0000-0000-0000-000000000000`,
      { method: 'POST', headers: { cookie } }
    )
    check(
      6,
      'unpublished and nonexistent are indistinguishable (both 404)',
      hiddenRes.status === 404 && missingRes.status === 404,
      `unpublished=${hiddenRes.status} missing=${missingRes.status}`
    )
  }

  // 7. No votes table exists. Dedupe is client-side precisely so that no
  //    voter identity is ever stored.
  {
    const { rows } = await client.query(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_name ilike '%vote%'`
    )
    check(
      7,
      'no votes table exists — no voter identity is stored anywhere',
      rows.length === 0,
      `found: ${rows.map((r) => r.table_name).join(', ')}`
    )
  }
} finally {
  await client.query(
    'delete from public.submissions where subject = any($1::text[])',
    [createdSubjects]
  )
  console.log('\n  (probe rows deleted)')
  await client.end()
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll assertions passed.\n')
process.exit(failures ? 1 : 0)
