import { ESCALATION_CONTACT, isEscalationContactConfigured } from '@/lib/escalation'

/**
 * Persistent on every form. Not decoration, not dismissible — CLAUDE.md line 138.
 *
 * The honest framing matters more than the wording: anonymity is a real
 * limitation, not just a feature. Someone reporting harm should know before they
 * type that an anonymous report cannot be followed up with them.
 */
export function EscalationNotice() {
  const configured = isEscalationContactConfigured()

  return (
    <aside
      className="rounded-lg border border-amber/40 bg-amber/5 p-4 text-sm leading-relaxed"
      aria-label="If this concerns harm to a person"
    >
      <p className="font-semibold text-amber">If this concerns harm to a person</p>
      <p className="mt-2 text-cream/80">
        Harassment, bullying, or anything affecting someone&rsquo;s safety is better
        raised through a named channel. An anonymous report cannot be followed up
        &mdash; nobody can come back to you for detail, check you&rsquo;re alright, or
        keep you informed.
      </p>

      {configured ? (
        <p className="mt-2 text-cream/80">
          Contact{' '}
          <span className="font-semibold text-cream">{ESCALATION_CONTACT.name}</span>{' '}
          ({ESCALATION_CONTACT.role}) at{' '}
          <a className="text-orange underline underline-offset-2" href={`mailto:${ESCALATION_CONTACT.contact}`}>
            {ESCALATION_CONTACT.contact}
          </a>
          . You can also submit here, and the council can escalate it onward.
        </p>
      ) : (
        <p className="mt-3 rounded border border-orange bg-orange/15 p-3 font-mono text-xs text-cream">
          LAUNCH BLOCKER — no escalation contact is configured. Set
          ESCALATION_CONTACT in src/lib/escalation.ts to a named person outside
          the student council before this portal accepts real submissions.
        </p>
      )}
    </aside>
  )
}
