/**
 * Where a disclosure about harm to a person goes.
 *
 * CLAUDE.md lines 125-138: an anonymous channel will eventually receive a report
 * of harassment or serious misconduct, possibly naming a mentor or staff member.
 * A student chairperson must not be the sole reader of those, and an anonymous
 * report cannot be followed up — so every form points at a named human who can.
 *
 * The placeholder below is deliberately loud. It renders as a visible warning
 * banner, not a silent empty string, so the portal cannot quietly go live
 * without a real contact.
 */
export const ESCALATION_CONTACT = {
  name: 'ESCALATION_CONTACT_UNSET',
  role: 'ESCALATION_ROLE_UNSET',
  contact: 'ESCALATION_EMAIL_UNSET',
} as const

export function isEscalationContactConfigured(): boolean {
  return !Object.values(ESCALATION_CONTACT).some((v) => v.endsWith('_UNSET'))
}
