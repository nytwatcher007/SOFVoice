/**
 * Access-gate suite (slice 2). Separate from test:anonymity, which CLAUDE.md
 * line 172 forbids editing.
 *
 * Runs against a live server so it exercises the real cookie plumbing, not a
 * mock. Start `npm run dev` first, or set TEST_BASE_URL.
 *
 * The signing logic here is reimplemented from node:crypto on purpose rather
 * than imported from src/lib/session.ts — an independent implementation is what
 * makes the forgery tests meaningful.
 */
import { createHmac } from 'node:crypto'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const CODE = process.env.MEMBER_ACCESS_CODE!
const SECRET = process.env.SESSION_SECRET!

let failures = 0
function check(n: number, label: string, ok: boolean, detail = '') {
  if (ok) console.log(`  PASS  ${n}. ${label}`)
  else {
    failures++
    console.error(`  FAIL  ${n}. ${label}${detail ? `\n        ${detail}` : ''}`)
  }
}

const sign = (body: string) =>
  createHmac('sha256', Buffer.from(SECRET, 'utf8')).update(body).digest('base64url')

const mint = (payload: object) => {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body)}`
}

const post = (code: string) =>
  fetch(`${BASE}/api/gate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
    redirect: 'manual',
  })

const getWithCookie = (path: string, cookie?: string) =>
  fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  })

console.log('\nAccess gate\n')

// 1. Wrong code rejected, no cookie issued.
{
  const res = await post('SOF-0000-0000-0000')
  const setCookie = res.headers.get('set-cookie') ?? ''
  check(
    1,
    'wrong code rejected with no cookie',
    res.status === 401 && !setCookie.includes('sof_gate='),
    `status=${res.status} set-cookie=${setCookie.slice(0, 60)}`
  )
}

// 2. Correct code issues an HttpOnly cookie.
let goodCookie = ''
{
  const res = await post(CODE)
  const setCookie = res.headers.get('set-cookie') ?? ''
  const m = /sof_gate=([^;]+)/.exec(setCookie)
  if (m) goodCookie = `sof_gate=${m[1]}`
  check(
    2,
    'correct code issues an HttpOnly cookie',
    res.status === 200 && !!m && /httponly/i.test(setCookie),
    `status=${res.status} set-cookie=${setCookie.slice(0, 80)}`
  )
}

// 3. The cookie leaks no code material (invariant 7).
{
  const value = decodeURIComponent(goodCookie.replace('sof_gate=', ''))
  const bare = CODE.replace(/-/g, '')
  const decodedBody = (() => {
    try {
      return Buffer.from(value.split('.')[0], 'base64url').toString('utf8')
    } catch {
      return ''
    }
  })()
  const leaks =
    value.includes(CODE) ||
    value.includes(bare) ||
    decodedBody.includes(CODE) ||
    decodedBody.includes(bare)
  check(
    3,
    'cookie contains no access-code material',
    !leaks,
    `payload=${decodedBody}`
  )
}

// 4. Protected route without a cookie redirects to /enter.
{
  const res = await getWithCookie('/')
  const loc = res.headers.get('location') ?? ''
  check(
    4,
    'protected route redirects to /enter when signed out',
    (res.status === 307 || res.status === 302) && loc.includes('/enter'),
    `status=${res.status} location=${loc}`
  )
}

// 5. THE IMPORTANT ONE — a tampered cookie must not be accepted.
//    Without this, a forged role=admin cookie would sail through in slice 6.
{
  const forged = [
    // Valid shape, but signed with the wrong key.
    (() => {
      const body = Buffer.from(
        JSON.stringify({ role: 'member', exp: Math.floor(Date.now() / 1000) + 999 })
      ).toString('base64url')
      return `${body}.${createHmac('sha256', Buffer.from('wrong-secret')).update(body).digest('base64url')}`
    })(),
    // Payload edited to a privileged role, original signature kept.
    (() => {
      const good = mint({ role: 'member', exp: Math.floor(Date.now() / 1000) + 999 })
      const sig = good.split('.')[1]
      const body = Buffer.from(
        JSON.stringify({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 999 })
      ).toString('base64url')
      return `${body}.${sig}`
    })(),
    // No signature at all.
    Buffer.from(JSON.stringify({ role: 'member', exp: 9999999999 })).toString('base64url'),
  ]

  let allRejected = true
  const accepted: string[] = []
  for (const [i, token] of forged.entries()) {
    const res = await getWithCookie('/', `sof_gate=${token}`)
    if (res.status === 200) {
      allRejected = false
      accepted.push(`forgery #${i + 1} returned 200`)
    }
  }
  check(5, 'tampered / unsigned cookies are rejected', allRejected, accepted.join('; '))
}

// 6. An expired but correctly signed cookie is rejected.
{
  const expired = mint({ role: 'member', exp: Math.floor(Date.now() / 1000) - 60 })
  const res = await getWithCookie('/', `sof_gate=${expired}`)
  check(
    6,
    'expired cookie is rejected even though the signature is valid',
    res.status !== 200,
    `status=${res.status}`
  )
}

// 7. A valid cookie actually works, and DELETE clears it.
{
  const ok = await getWithCookie('/', goodCookie)
  const del = await fetch(`${BASE}/api/gate`, {
    method: 'DELETE',
    headers: { cookie: goodCookie },
  })
  const cleared = del.headers.get('set-cookie') ?? ''
  check(
    7,
    'valid cookie grants access, and Leave clears it',
    ok.status === 200 && /sof_gate=;|Max-Age=0/i.test(cleared),
    `get=${ok.status} clear=${cleared.slice(0, 70)}`
  )
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll assertions passed.\n')
process.exit(failures ? 1 : 0)
