import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'
import { checkAdmin } from '@/lib/admin'
import { query } from '@/lib/db'

/**
 * Admin sign-in. Deliberately separate from the member gate: a member session
 * is a role with no identity, an admin session is a named person.
 *
 * Note this route is under /api/admin/* and so is enumerated by
 * test:anonymity assertion 5 — which is correct. A member-level cookie must not
 * be able to authenticate here, and it can't: this checks Supabase Auth
 * credentials, not the gate cookie.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required.' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    // Generic message — do not reveal whether the account exists.
    return NextResponse.json({ error: 'Those details did not work.' }, { status: 401 })
  }

  // Authenticated is not the same as authorised. Without a row in admin_users,
  // sign them straight back out rather than leaving a live session around.
  const { rows } = await query(
    'select 1 from public.admin_users where user_id = $1',
    [data.user.id]
  )
  if (!rows[0]) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Those details did not work.' }, { status: 401 })
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const mfaRequired = aal?.nextLevel !== 'aal2' || aal.currentLevel !== 'aal2'

  return NextResponse.json({ ok: true, mfaRequired })
}

/**
 * Who am I?
 *
 * Exists so that every method on every /api/admin/* route answers with an
 * authorisation status rather than a 405. A 405 means "method not handled" — it
 * does NOT mean "this route is protected", and relying on one would mean a
 * future GET handler added without an auth check goes unnoticed.
 * test:anonymity assertion 5 caught exactly this.
 */
export async function GET() {
  const check = await checkAdmin()
  if (!check.ok) {
    const status = check.reason === 'anonymous' ? 401 : 403
    return NextResponse.json({ error: 'Not permitted.' }, { status })
  }
  return NextResponse.json({ admin: check.admin })
}

/** Sign out. */
export async function DELETE() {
  const supabase = await getSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
