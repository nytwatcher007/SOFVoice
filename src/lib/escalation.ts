/**
 * Where a disclosure about harm to a person goes.
 *
 * CLAUDE.md lines 125-138: an anonymous channel will eventually receive a report
 * of harassment or serious misconduct, possibly naming a mentor or staff member.
 * A student chairperson must not be the sole reader of those, and an anonymous
 * report cannot be followed up — so every form points at a named human who can.
 *
 * STATUS: intended contact identified, address NOT yet verified.
 *
 * Akshay Muralidharan (faculty / administration, outside the student council)
 * is the intended contact, and is expecting the role — but has not formally
 * confirmed it.
 *
 * The address supplied was `akshay@sof.com`, which is NOT SoF's domain. SoF's
 * site publishes `info@theschooloffuture.com`; `sof.com` belongs to an
 * unrelated party. Publishing it would route safeguarding disclosures to a
 * stranger's inbox and would fail silently — nobody would learn the mail never
 * arrived. So the placeholder stays until a real address is verified by sending
 * a test mail to it.
 *
 * The placeholder is deliberately loud rather than plausible: it renders a
 * visible LAUNCH BLOCKER banner, so this cannot quietly ship. A wrong-looking
 * address that happens to work is safer than a right-looking address that
 * doesn't.
 */
export const ESCALATION_CONTACT = {
  name: 'Akshay Muralidharan',
  role: 'Faculty / administration',
  contact: 'ESCALATION_EMAIL_UNSET',
} as const

export function isEscalationContactConfigured(): boolean {
  return !Object.values(ESCALATION_CONTACT).some((v) => v.endsWith('_UNSET'))
}
