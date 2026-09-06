import 'server-only'
import { query } from './db'
import type { SubmissionKind, SubmissionStatus } from './submissions'

export interface AdminSubmission {
  id: string
  kind: SubmissionKind
  category: string
  subject: string
  body: string
  name: string | null
  contact: string | null
  status: SubmissionStatus
  reply: string | null
  created_on: Date
  published: boolean
}

/**
 * The queue.
 *
 * Deliberately returns NO counts and NO aggregates. CLAUDE.md lines 120-121:
 * the dashboard never displays category counts, submission volume over time, or
 * anything else that lets an admin narrow a pool. "Three complaints about
 * Community & conduct this week" plus knowing who was in the room is often
 * enough to identify someone in a cohort this size.
 *
 * If a future task asks for a stats panel, the task is wrong. Do not add
 * count(*) to this file.
 *
 * Ordering is (created_on desc, ref_hash). ref_hash is a SHA-256, so ordering
 * within a day is effectively random — that is intentional, and a tiebreaker
 * column would reinstate the submission sequence invariant 4 exists to hide.
 */
export async function listSubmissions(filters: {
  status?: SubmissionStatus
  kind?: SubmissionKind
}): Promise<AdminSubmission[]> {
  const where: string[] = []
  const values: unknown[] = []

  if (filters.status) {
    values.push(filters.status)
    where.push(`status = $${values.length}`)
  }
  if (filters.kind) {
    values.push(filters.kind)
    where.push(`kind = $${values.length}`)
  }

  const { rows } = await query<AdminSubmission>(
    `select id, kind, category, subject, body, name, contact,
            status, reply, created_on, published
       from public.submissions
      ${where.length ? `where ${where.join(' and ')}` : ''}
      order by created_on desc, ref_hash
      limit 200`,
    values
  )
  return rows
}

export async function getSubmission(id: string): Promise<AdminSubmission | null> {
  const { rows } = await query<AdminSubmission>(
    `select id, kind, category, subject, body, name, contact,
            status, reply, created_on, published
       from public.submissions
      where id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function updateSubmission(
  id: string,
  changes: {
    status?: SubmissionStatus
    reply?: string | null
    published?: boolean
  }
): Promise<AdminSubmission | null> {
  const sets: string[] = []
  const values: unknown[] = []

  if (changes.status) {
    values.push(changes.status)
    sets.push(`status = $${values.length}`)
  }
  if (changes.reply !== undefined) {
    values.push(changes.reply)
    sets.push(`reply = $${values.length}`)
  }
  if (changes.published !== undefined) {
    // The submissions_only_suggestions_published CHECK constraint refuses this
    // for a complaint, so an accidental publish of an anonymous complaint is
    // impossible at the storage layer rather than merely unlikely in the UI.
    values.push(changes.published)
    sets.push(`published = $${values.length}`)
  }
  if (!sets.length) return getSubmission(id)

  values.push(id)
  const { rows } = await query<AdminSubmission>(
    `update public.submissions set ${sets.join(', ')}
      where id = $${values.length}
      returning id, kind, category, subject, body, name, contact,
                status, reply, created_on, published`,
    values
  )
  return rows[0] ?? null
}
