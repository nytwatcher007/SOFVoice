import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { addInterest } from '@/lib/board'

/**
 * Register interest in a published suggestion.
 *
 * Records no voter — see the note in src/lib/board.ts. Dedupe happens in the
 * browser, so this endpoint is honestly inflatable; the UI presents counts as
 * "interest" rather than votes for that reason.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const upvotes = await addInterest(id)
  if (upvotes === null) {
    // Unpublished, a complaint, or nonexistent — all answer identically so the
    // endpoint cannot be used to probe for unpublished submissions.
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  return NextResponse.json({ upvotes })
}
