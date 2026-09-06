import { query } from './db'
import { generateReferenceCode, hashReferenceCode, normalizeReferenceCode } from './reference'

export type SubmissionKind = 'complaint' | 'suggestion'
export type SubmissionStatus =
  | 'new'
  | 'reviewing'
  | 'resolved'
  | 'dismissed'
  | 'escalated'

export interface NewSubmission {
  kind: SubmissionKind
  category: string
  subject: string
  body: string
  /** Ignored entirely for complaints. Honoured for suggestions only if revealName. */
  name?: string | null
  contact?: string | null
  /** The explicit reveal toggle. Defaults off (invariant 9). */
  revealName?: boolean
}

/**
 * The single place identity is allowed to survive into storage.
 *
 * Deliberately takes the whole input and returns what may be persisted, rather
 * than mutating in the caller — so there is exactly one code path to audit, and
 * `npm run test:anonymity` can exercise it directly.
 */
export function sanitizeIdentity(input: NewSubmission): {
  name: string | null
  contact: string | null
} {
  // Invariant 2: complaints are anonymous regardless of what arrived in the
  // request body. Not "if the client omitted it" — unconditionally.
  if (input.kind === 'complaint') return { name: null, contact: null }

  // Invariant 9: suggestions carry a name only on an explicit opt-in.
  if (!input.revealName) return { name: null, contact: null }

  const trim = (v: string | null | undefined) => {
    const t = (v ?? '').trim()
    return t.length ? t : null
  }
  return { name: trim(input.name), contact: trim(input.contact) }
}

export async function createSubmission(
  input: NewSubmission
): Promise<{ id: string; referenceCode: string }> {
  const { name, contact } = sanitizeIdentity(input)

  // Plaintext is returned to the submitter once, here, and never persisted.
  const referenceCode = generateReferenceCode()

  const { rows } = await query<{ id: string }>(
    `insert into public.submissions
       (kind, category, subject, body, name, contact, ref_hash)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [
      input.kind,
      input.category,
      input.subject,
      input.body,
      name,
      contact,
      hashReferenceCode(referenceCode),
    ]
  )

  return { id: rows[0].id, referenceCode }
}

/**
 * Look a submission up by the code the submitter typed. Works only by hashing
 * what they give us — there is no way to enumerate or recover a lost code.
 */
export async function findByReferenceCode(code: string) {
  const normalized = normalizeReferenceCode(code)
  if (!normalized) return null

  const { rows } = await query(
    `select id, kind, category, subject, body, status, reply, created_on
       from public.submissions
      where ref_hash = $1`,
    [hashReferenceCode(normalized)]
  )
  return rows[0] ?? null
}
