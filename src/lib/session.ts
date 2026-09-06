import 'server-only'
import { createHmac, timingSafeEqual, randomInt } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const GATE_COOKIE = 'sof_gate'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 days

export type Role = 'member'

/**
 * The session is a signed assertion of a ROLE and nothing else.
 *
 * There is deliberately no session table, no session id, and no user record.
 * A stored session would be exactly the identity anchor invariant 1 forbids —
 * once a session row exists, joining it to a submission is one careless query
 * away. Statelessness here is a privacy property, not a performance choice.
 */
interface Payload {
  role: Role
  exp: number // unix seconds
}

function secret(): Buffer {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set. Run: npm run gen:code')
  return Buffer.from(s, 'utf8')
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

/** Constant-time compare that tolerates unequal lengths without throwing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) {
    // Still burn a comparison so length mismatch isn't a fast path.
    timingSafeEqual(ab, ab)
    return false
  }
  return timingSafeEqual(ab, bb)
}

export function createToken(role: Role): string {
  const payload: Payload = {
    role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body)}`
}

/** Returns the payload only if the signature verifies AND it hasn't expired. */
export function verifyToken(token: string | undefined): Payload | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null

  const body = token.slice(0, dot)
  const providedSig = token.slice(dot + 1)

  // Signature first — never parse attacker-controlled JSON we haven't authenticated.
  if (!safeEqual(providedSig, sign(body))) return null

  let payload: Payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (payload.role !== 'member') return null
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null

  return payload
}

/**
 * Compares a submitted access code against MEMBER_ACCESS_CODE.
 *
 * Invariant 7: the code is only ever compared server-side. Nothing derived from
 * it — no hash, no salt, no prefix — is returned to the caller or placed in the
 * cookie, so a member's browser never holds material that could reconstruct it.
 */
export function verifyAccessCode(submitted: string): boolean {
  const expected = process.env.MEMBER_ACCESS_CODE
  if (!expected) throw new Error('MEMBER_ACCESS_CODE is not set. Run: npm run gen:code')
  return safeEqual(normalizeCode(submitted), normalizeCode(expected))
}

/** People retype codes in lowercase, drop hyphens, and paste trailing spaces. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '')
}

export function cookieOptions() {
  return {
    httpOnly: true, // never readable by JS
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}

/** Current session, or null. Safe to call anywhere on the server. */
export async function getSession(): Promise<Payload | null> {
  const store = await cookies()
  return verifyToken(store.get(GATE_COOKIE)?.value)
}

/**
 * The REAL authorization check.
 *
 * proxy.ts does an optimistic cookie-presence check for redirect UX only —
 * Next's own docs say proxy "should not be used as a full session management or
 * authorization solution". Every protected server component and route handler
 * must call this, because the proxy can be bypassed.
 */
export async function requireMember(): Promise<Payload> {
  const session = await getSession()
  if (!session) redirect('/enter')
  return session
}

/** Small helper so failed logins don't leak a timing signal via early return. */
export async function constantDelay(): Promise<void> {
  await new Promise((r) => setTimeout(r, 120 + randomInt(80)))
}
