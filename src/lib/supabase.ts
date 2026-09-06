import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase Auth client for ADMINS only.
 *
 * Submitters never touch this. They have no account by design — see the
 * asymmetry in CLAUDE.md lines 78-88. This client exists solely so that admin
 * actions are attributable to a named person.
 *
 * Uses the ANON key, not the service-role key: this client acts as the logged-in
 * admin, and giving it service-role would defeat the point of authenticating at
 * all. Data access still goes through src/lib/db.ts.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore — the session is refreshed in route handlers.
          }
        },
      },
    }
  )
}
