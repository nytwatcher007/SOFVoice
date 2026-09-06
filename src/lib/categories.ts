/**
 * Deliberately broad, and deliberately short.
 *
 * CLAUDE.md line 122: categories stay broad, because in a cohort this small a
 * narrow category is identity by another name. There is no `year`, `cohort`,
 * `track` or `department` field and there must never be one — a complaint
 * tagged "Year 2, Marketing track" identifies its author to anyone who knows
 * the room, whatever the rest of the schema does.
 *
 * Single source of truth for the complaint form, the suggestion form, and the
 * dashboard filter.
 */
export const CATEGORIES = [
  'Academics & teaching',
  'Facilities & campus',
  'Administration & process',
  'Community & conduct',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

/** Server-side allowlist check. Never trust a category off the wire. */
export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

export const SUBJECT_MIN = 3
export const SUBJECT_MAX = 120
export const BODY_MIN = 20
export const BODY_MAX = 5000
