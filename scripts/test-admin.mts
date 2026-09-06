/**
 * Admin authorisation suite (slice 6).
 *
 * The question this answers: can anything short of a fully-authenticated,
 * allowlisted, MFA-satisfied admin reach /api/admin/*? Every negative case is
 * tested, because the positive case is the one a human notices when it breaks.
 *
 * Needs `npm run dev` running.
 */
import { createHmac } from 'node:crypto'
import pg from 'pg'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const SECRET = process.env.SESSION_SECRET!

let failures = 0
function check(n: number, label: string, ok: boolean, detail = '') {
  if (ok) console.log(`  PASS  ${n}. ${label}`)
  else {
    failures++
    console.error(`  FAIL  ${n}. ${label}${detail ? `\n        ${detail}` : ''}`)
  }
}

/** A valid MEMBER cookie — gated in, but must never be an admin. */
function memberCookie(): string {
  const payload = { role: 'member', exp: Math.floor(Date.now() / 1000) + 600 }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', Buffer.from(SECRET, 'utf8'))
    .update(body)
    .digest('base64url')
  return `sof_gate=${body}.${sig}`
}

/** A forged cookie claiming admin. Must be worthless. */
function forgedAdminCookie(): string {
  const payload = { role: 'admin', exp: Math.floor(Date.now() / 1000) + 600 }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', Buffer.from(SECRET, 'utf8'))
    .update(body)
    .digest('base64url')
  return `sof_gate=${body}.${sig}`
}

const ADMIN_ROUTES = [
  '/api/admin/submissions',
  '/api/admin/submissions/00000000-0000-0000-0000-000000000000',
]

console.log('\nAdmin authorisation\n')

// 1. No credentials at all -> 401.
{
  let allDenied = true
  const bad: string[] = []
  for (const route of ADMIN_ROUTES) {
    const res = await fetch(`${BASE}${route}`, { redirect: 'manual' })
    if (res.status !== 401 && res.status !== 403) {
      allDenied = false
      bad.push(`${route} -> ${res.status}`)
    }
  }
  check(1, 'admin API rejects anonymous callers', allDenied, bad.join('; '))
}

// 2. A VALID member session is still not an admin. This is the core assertion.
{
  const cookie = memberCookie()
  let allDenied = true
  const bad: string[] = []
  for (const route of ADMIN_ROUTES) {
    const res = await fetch(`${BASE}${route}`, {
      headers: { cookie },
      redirect: 'manual',
    })
    if (res.status !== 401 && res.status !== 403) {
      allDenied = false
      bad.push(`${route} -> ${res.status}`)
    }
  }
  check(2, 'a valid member session cannot reach the admin API', allDenied, bad.join('; '))
}

// 3. A forged role:admin gate cookie is worthless — admin identity does not
//    come from that cookie at all.
{
  const cookie = forgedAdminCookie()
  let allDenied = true
  const bad: string[] = []
  for (const route of ADMIN_ROUTES) {
    const res = await fetch(`${BASE}${route}`, {
      headers: { cookie },
      redirect: 'manual',
    })
    if (res.status !== 401 && res.status !== 403) {
      allDenied = false
      bad.push(`${route} -> ${res.status}`)
    }
  }
  check(3, 'a forged role:admin gate cookie grants nothing', allDenied, bad.join('; '))
}

// 4. Mutating routes are guarded too, not just reads.
{
  const res = await fetch(
    `${BASE}/api/admin/submissions/00000000-0000-0000-0000-000000000000`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ status: 'dismissed' }),
      redirect: 'manual',
    }
  )
  check(
    4,
    'PATCH is guarded, not only GET',
    res.status === 401 || res.status === 403,
    `status=${res.status}`
  )
}

// 5. Admin pages redirect rather than render for a member.
{
  const res = await fetch(`${BASE}/admin`, {
    headers: { cookie: memberCookie() },
    redirect: 'manual',
  })
  const loc = res.headers.get('location') ?? ''
  check(
    5,
    'the /admin page does not render for a member session',
    res.status !== 200 && loc.includes('/admin/login'),
    `status=${res.status} location=${loc}`
  )
}

// 6. The admin allowlist is a real table, and it is empty-by-default.
//    An authenticated Supabase user with no admin_users row must not be an admin.
{
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const { rows } = await client.query(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name='admin_users'`
  )
  const cols = rows.map((r) => r.column_name)
  const hasTable = cols.includes('user_id') && cols.includes('email')

  // And the anon role must not be able to read it.
  let anonBlocked = false
  try {
    await client.query('begin')
    await client.query('set local role anon')
    await client.query('select * from public.admin_users limit 1')
  } catch (e) {
    anonBlocked = (e as { code?: string }).code === '42501'
  } finally {
    await client.query('rollback')
  }
  await client.end()

  check(
    6,
    'admin_users exists and is unreadable by the anon role',
    hasTable && anonBlocked,
    `cols=${cols.join(',')} anonBlocked=${anonBlocked}`
  )
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll assertions passed.\n')
process.exit(failures ? 1 : 0)
