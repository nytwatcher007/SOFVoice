import { NextResponse } from 'next/server'
import {
  GATE_COOKIE,
  cookieOptions,
  createToken,
  verifyAccessCode,
  constantDelay,
} from '@/lib/session'

/**
 * Enter the closed circuit.
 *
 * Deliberately records nothing. No IP, no user-agent, no attempt counter, not
 * in the database (invariant 3) and not in application logs either — a log of
 * "who tried to get in at 14:32" recreates exactly the correlation risk the
 * schema was designed to remove.
 */
export async function POST(request: Request) {
  let code = ''
  try {
    const body = await request.json()
    code = typeof body?.code === 'string' ? body.code : ''
  } catch {
    // fall through to the generic failure below
  }

  if (!code || !verifyAccessCode(code)) {
    // Pad failures so response time doesn't distinguish "empty", "wrong
    // length" and "wrong code".
    await constantDelay()
    return NextResponse.json(
      { error: "That code isn't right." },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(GATE_COOKIE, createToken('member'), cookieOptions())
  return response
}

/** The Leave button. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(GATE_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
  return response
}
