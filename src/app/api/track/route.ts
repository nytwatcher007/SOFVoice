import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { findByReferenceCode } from '@/lib/submissions'

/**
 * Look up a submission by its reference code.
 *
 * POST, never GET — and this is the important part of the file.
 *
 * A `GET /api/track?code=SV-3KQ7WM2A` would put the reference code in the URL,
 * and URLs land in Vercel's request logs, in browser history, and in any proxy
 * between. We already accept that the host logs client IP against request time
 * (see README launch blockers). Putting the code in the URL as well would mean
 * those logs contain IP + timestamp + the key to a specific submission — the
 * exact deanonymisation path the schema exists to prevent, handed over in one
 * query string.
 *
 * For the same reason there is no shareable track URL and no code in the path.
 */
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let code = ''
  try {
    const body = await request.json()
    code = typeof body?.code === 'string' ? body.code : ''
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  if (!code.trim()) {
    return NextResponse.json({ error: 'Enter your reference code.' }, { status: 400 })
  }

  const submission = await findByReferenceCode(code)

  if (!submission) {
    // Nothing distinguishes "never existed" from "purged at term end". There is
    // nothing useful to say, and a distinction would leak.
    return NextResponse.json(
      { error: "No submission found for that code." },
      { status: 404 }
    )
  }

  // findByReferenceCode already excludes body/name/contact/id/ref_hash.
  return NextResponse.json({ submission })
}
