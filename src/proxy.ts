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
  // Everything except the gate itself, its API, Next internals, and the logo
  // files — otherwise the gate screen cannot load its own assets.
  matcher: ['/((?!enter|api/gate|_next/static|_next/image|favicon.ico|sof-logo-).*)'],
}
