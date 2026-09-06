/**
 * Where a disclosure about harm to a person goes.
 *
 * CLAUDE.md lines 125-138: an anonymous channel will eventually receive a report
 * of harassment or serious misconduct, possibly naming a mentor or staff member.
 * A student chairperson must not be the sole reader of those, and an anonymous
 * report cannot be followed up — so every form points at a named human who can.
 *
 * Akshay Muralidharan (faculty / administration, outside the student council)
 * has CONFIRMED the role.
 *
 * The address below is a DEMO value and is not deliverable. `sof.com` is not
 * SoF's domain — SoF publishes `info@theschooloffuture.com`, and `sof.com`
 * belongs to an unrelated party. Mail sent here reaches a stranger, or nobody,
 * and does so *silently*: no bounce tells a student their disclosure went
 * nowhere.
 *
 * `verified` is therefore a separate flag from having an address at all. It is
 * the difference between "we typed something in" and "we sent a test email and
 * it arrived". Do not set it true without doing the latter.
 */
export const ESCALATION_CONTACT = {
  name: 'Akshay Muralidharan',
  role: 'Faculty / administration',
  contact: 'akshay@sof.com',
  /** Set true ONLY after a test email to the address above has been received. */
  verified: false,
} as const

/** Is there an address at all? */
export function hasEscalationContact(): boolean {
  return !ESCALATION_CONTACT.contact.endsWith('_UNSET')
}

/** Is that address known to actually work? */
export function isEscalationContactConfigured(): boolean {
  return hasEscalationContact() && ESCALATION_CONTACT.verified
}
