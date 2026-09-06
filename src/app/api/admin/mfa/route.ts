import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'

/**
 * TOTP enrolment and verification.
 *
 * MFA is mandatory rather than encouraged: this account can read every
 * complaint in the school, including ones about staff conduct. A password alone
 * on that is not enough.
 */

/**
 * Enrolment status.
 *
 * Present so this route answers GET with an authorisation status rather than a
 * 405 — see the note on /api/admin/session. Every method on every admin route
 * must make an auth decision.
 */
export async function GET() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data: factors } = await supabase.auth.mfa.listFactors()
  return NextResponse.json({
    enrolled: !!factors?.totp?.some((f) => f.status === 'verified'),
  })
}

/** Start enrolment — returns a QR code to scan. */
export async function POST() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `sof-voice-${Date.now()}`,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    factorId: data.id,
    qr: data.totp.qr_code,
    secret: data.totp.secret,
  })
}

/** Verify a 6-digit code — completes enrolment, or steps a session up to aal2. */
export async function PUT(request: Request) {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : ''
  let factorId = typeof body.factorId === 'string' ? body.factorId : ''

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
  }

  // Signing in fresh means no factorId to hand: find the enrolled one.
  if (!factorId) {
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const verified = factors?.totp?.find((f) => f.status === 'verified')
    if (!verified) {
      return NextResponse.json({ error: 'No authenticator enrolled.' }, { status: 400 })
    }
    factorId = verified.id
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) {
    return NextResponse.json({ error: challengeError.message }, { status: 400 })
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (verifyError) {
    return NextResponse.json({ error: 'That code was not accepted.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
