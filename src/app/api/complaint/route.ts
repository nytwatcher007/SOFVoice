import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createSubmission } from '@/lib/submissions'
import {
  isCategory,
  SUBJECT_MIN,
  SUBJECT_MAX,
  BODY_MIN,
  BODY_MAX,
} from '@/lib/categories'

/**
 * Anonymous accountability complaint.
 *
 * Anonymity is guaranteed three independent times, on purpose:
 *   1. this handler never reads name/contact off the request at all
 *   2. sanitizeIdentity() in src/lib/submissions.ts nulls them regardless
 *   3. the submissions_complaints_are_anonymous CHECK constraint refuses the
 *      row outright if the first two ever fail
 *
 * Logs nothing. No IP, no user-agent, no request record — not in the database
 * (invariant 3) and not in application logs, where a timestamped access record
 * recreates the correlation risk the schema was built to remove.
 */
export async function POST(request: Request) {
  // 401 rather than a redirect: requireMember() redirects, which is correct for
  // a page and wrong for an API.
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const category = body.category
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const text = typeof body.body === 'string' ? body.body.trim() : ''

  if (!isCategory(category)) {
    return NextResponse.json({ error: 'Choose a category.' }, { status: 400 })
  }
  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
    return NextResponse.json(
      { error: `Subject must be ${SUBJECT_MIN}–${SUBJECT_MAX} characters.` },
      { status: 400 }
    )
  }
  if (text.length < BODY_MIN || text.length > BODY_MAX) {
    return NextResponse.json(
      { error: `Description must be ${BODY_MIN}–${BODY_MAX} characters.` },
      { status: 400 }
    )
  }

  // Note what is NOT passed: no name, no contact, no revealName. Even if the
  // request body carried them, they are never read here.
  const { referenceCode } = await createSubmission({
    kind: 'complaint',
    category,
    subject,
    body: text,
  })

  // The only moment the plaintext code exists outside the submitter's screen.
  return NextResponse.json({ referenceCode })
}
