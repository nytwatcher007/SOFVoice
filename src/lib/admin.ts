import 'server-only'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from './supabase'
import { query } from './db'

export interface AdminUser {
  user_id: string
  email: string
  label: string | null
}

export type AdminCheck =
  | { ok: true; admin: AdminUser }
  | { ok: false; reason: 'anonymous' | 'not-admin' | 'mfa-required' }

/**
 * Three gates, all of which must pass:
 *
 *   1. a valid Supabase Auth session
 *   2. a row in admin_users  — being authenticated is NOT being an admin, and
 *      this is what makes revocation a single DELETE rather than a redeploy
 *   3. assurance level aal2  — MFA actually satisfied, not merely enrolled
 *
 * Gate 3 matters more than it looks. Supabase reports `aal1` for a
 * password-only session even when the user has TOTP enrolled, so checking
 * "does this user have MFA?" would pass an unverified session straight through.
 * We check what the session actually achieved.
 */
export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'anonymous' }

  const { rows } = await query<AdminUser>(
    'select user_id, email, label from public.admin_users where user_id = $1',
    [user.id]
  )
  if (!rows[0]) return { ok: false, reason: 'not-admin' }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  // nextLevel aal2 means a factor is enrolled. currentLevel must match it.
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    return { ok: false, reason: 'mfa-required' }
  }
  // No factor enrolled at all — enrolment is mandatory for an account that can
  // read every complaint in the school.
  if (aal?.nextLevel !== 'aal2') {
    return { ok: false, reason: 'mfa-required' }
  }

  return { ok: true, admin: rows[0] }
}

/** For pages: redirects. */
export async function requireAdmin(): Promise<AdminUser> {
  const result = await checkAdmin()
  if (result.ok) return result.admin

  if (result.reason === 'mfa-required') redirect('/admin/mfa')
  redirect('/admin/login')
}
