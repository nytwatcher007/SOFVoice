import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next.js 16 renamed middleware.ts to proxy.ts. See
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
//
// This is an OPTIMISTIC check only. It tests for the presence of the cookie,
// not its validity, because Next's own docs say proxy "should not be used as a
// full session management or authorization solution".
//
// The real check is requireMember() in src/lib/session.ts, called inside every
// protected page and route handler. Do not move authorization here.
export function proxy(request: NextRequest) {
  const hasCookie = request.cookies.has('sof_gate')
  if (hasCookie) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/enter'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  // Excludes the gate screen, Next internals, and the logo files — otherwise
  // the gate cannot load its own assets.
  //
  // ALL of /api is excluded too. Redirecting an API request to an HTML page is
  // the wrong answer: a caller gets a 200 full of markup instead of a 401, and
  // fetch() follows the redirect silently. Route handlers check the session
  // themselves and return a real status code.
  //
  // /admin is excluded too. Admins authenticate with Supabase Auth, not the
  // shared member code — the two identities are deliberately asymmetric
  // (CLAUDE.md lines 78-88). Without this exclusion a chairperson would be
  // bounced to the member gate before ever reaching their own sign-in.
  matcher: ['/((?!enter|admin|api/|_next/static|_next/image|favicon.ico|sof-logo-).*)'],
}
