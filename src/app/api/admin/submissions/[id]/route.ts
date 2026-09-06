import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin'
import { getSubmission, updateSubmission } from '@/lib/admin-data'
import type { SubmissionStatus } from '@/lib/submissions'

const STATUSES: SubmissionStatus[] = [
  'new',
  'reviewing',
  'resolved',
  'dismissed',
  'escalated',
]

async function guard() {
  const check = await checkAdmin()
  if (check.ok) return null
  const status = check.reason === 'anonymous' ? 401 : 403
  return NextResponse.json({ error: 'Not permitted.' }, { status })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guard()
  if (denied) return denied

  const { id } = await params
  const submission = await getSubmission(id)
  if (!submission) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  return NextResponse.json({ submission })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guard()
  if (denied) return denied

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const status =
    typeof body.status === 'string' && STATUSES.includes(body.status as SubmissionStatus)
      ? (body.status as SubmissionStatus)
      : undefined

  const reply =
    body.reply === undefined
      ? undefined
      : typeof body.reply === 'string'
        ? body.reply.trim() || null
        : null

  if (!status && reply === undefined) {
    return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })
  }

  const submission = await updateSubmission(id, { status, reply })
  if (!submission) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  return NextResponse.json({ submission })
}
