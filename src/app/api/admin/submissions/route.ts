import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin'
import { listSubmissions } from '@/lib/admin-data'
import type { SubmissionKind, SubmissionStatus } from '@/lib/submissions'

const STATUSES = ['new', 'reviewing', 'resolved', 'dismissed', 'escalated']
const KINDS = ['complaint', 'suggestion']

/**
 * A member-level session must NOT reach this route. test:anonymity assertion 5
 * enumerates every /api/admin/* route and asserts exactly that — it has been
 * vacuous since slice 1 and this is the route that gives it teeth.
 */
export async function GET(request: Request) {
  const check = await checkAdmin()
  if (!check.ok) {
    // 403 for a real-but-insufficient identity, 401 for none at all.
    const status = check.reason === 'anonymous' ? 401 : 403
    return NextResponse.json({ error: 'Not permitted.' }, { status })
  }

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  const kindParam = url.searchParams.get('kind')

  const submissions = await listSubmissions({
    status: STATUSES.includes(statusParam ?? '')
      ? (statusParam as SubmissionStatus)
      : undefined,
    kind: KINDS.includes(kindParam ?? '') ? (kindParam as SubmissionKind) : undefined,
  })

  // No totals, no counts, no aggregates — see src/lib/admin-data.ts.
  return NextResponse.json({ submissions })
}
