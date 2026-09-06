import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createSubmission } from '@/lib/submissions'
import {
  isCategory,
  SUBJECT_MIN,
  SUBJECT_MAX,
  BODY_MIN,
  BODY_MAX,
  NAME_MAX,
  CONTACT_MAX,
} from '@/lib/categories'

/**
 * A suggestion. Anonymous by default; may carry a name only when the submitter
 * explicitly turned the reveal toggle on (invariant 9).
 *
 * This is the one endpoint where identity is allowed to survive into storage,
 * which is exactly why the reveal flag is handled here rather than inferred
 * from "did they type a name". Typing a name is not consent to publish it.
 *
 * Logs nothing — no IP, no user-agent, no request record.
 */
export async function POST(request: Request) {
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

  // Explicit opt-in only. Anything other than a literal true is "no".
  const revealName = body.revealName === true
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim() : ''

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
      { error: `Suggestion must be ${BODY_MIN}–${BODY_MAX} characters.` },
      { status: 400 }
    )
  }

  if (revealName) {
    // Reject rather than silently storing an anonymous row — otherwise someone
    // ticks the box, types nothing, and believes they have been credited.
    if (!name) {
      return NextResponse.json(
        { error: 'Add your name, or switch off "Add my name".' },
        { status: 400 }
      )
    }
    if (name.length > NAME_MAX) {
      return NextResponse.json(
        { error: `Name must be ${NAME_MAX} characters or fewer.` },
        { status: 400 }
      )
    }
    if (contact.length > CONTACT_MAX) {
      return NextResponse.json(
        { error: `Contact must be ${CONTACT_MAX} characters or fewer.` },
        { status: 400 }
      )
    }
  }

  const { referenceCode } = await createSubmission({
    kind: 'suggestion',
    category,
    subject,
    body: text,
    // sanitizeIdentity() discards both unless revealName is true, so passing
    // them unconditionally here is safe by construction.
    name,
    contact,
    revealName,
  })

  return NextResponse.json({ referenceCode })
}
