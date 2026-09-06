import 'server-only'
import { query } from './db'

export interface BoardEntry {
  id: string
  category: string
  subject: string
  body: string
  upvotes: number
  created_on: Date
}

/**
 * The public suggestion board.
 *
 * NEVER selects `name` or `contact`, and that is a consent decision rather than
 * a schema one. The reveal toggle tells people their name is "stored and visible
 * to the student council" — publishing it to the entire cohort is a wider
 * audience than anyone agreed to. Everyone who ticked that box did so under
 * those words, so the board shows no attribution at all.
 *
 * If a future task asks to credit submitters on the board, it needs a second,
 * separate opt-in on the form first. Do not just add `name` to this query.
 *
 * Ordering is (upvotes desc, ref_hash) — never insertion order, which would
 * reinstate the submission sequence invariant 4 exists to hide.
 */
export async function listBoard(): Promise<BoardEntry[]> {
  const { rows } = await query<BoardEntry>(
    `select id, category, subject, body, upvotes, created_on
       from public.submissions
      where published and kind = 'suggestion'
      order by upvotes desc, ref_hash
      limit 200`
  )
  return rows
}

/**
 * Register interest in a suggestion.
 *
 * There is no vote record and no voter id — a votes(submission_id, voter_id)
 * table would be exactly the identity anchor invariant 1 forbids, and a voter id
 * that also appeared on a submission would become a correlation handle between
 * "who votes" and "who submits".
 *
 * The consequence, which the UI states plainly rather than hiding: dedupe is
 * client-side only, so these counts are indicative and can be inflated by
 * someone determined. That is the price of not tracking people, and it is the
 * right trade for this portal.
 *
 * Guarded to published suggestions so a complaint can never accumulate a count.
 */
export async function addInterest(id: string): Promise<number | null> {
  const { rows } = await query<{ upvotes: number }>(
    `update public.submissions
        set upvotes = upvotes + 1
      where id = $1 and published and kind = 'suggestion'
      returning upvotes`,
    [id]
  )
  return rows[0]?.upvotes ?? null
}
