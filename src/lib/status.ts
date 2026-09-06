import type { SubmissionStatus } from './submissions'

/**
 * Plain-English status, because a bare enum tells a submitter nothing.
 *
 * "escalated" is worded carefully: someone who reported harm needs to know it
 * left the student council, since a student chairperson has no standing to act
 * on a disclosure about a staff member.
 */
export const STATUS_LABELS: Record<SubmissionStatus, { label: string; detail: string }> = {
  new: {
    label: 'Received',
    detail: 'Logged and waiting to be reviewed by the council.',
  },
  reviewing: {
    label: 'Being looked at',
    detail: 'Someone on the council is working through this.',
  },
  resolved: {
    label: 'Resolved',
    detail: 'The council considers this closed. Any reply is below.',
  },
  dismissed: {
    label: 'Closed without action',
    detail: 'The council decided not to take this further. Any reason is below.',
  },
  escalated: {
    label: 'Passed on',
    detail:
      'This was handed to a contact outside the student council who can act on it.',
  },
}

export const STATUS_TONE: Record<SubmissionStatus, string> = {
  new: 'border-cream/30 text-cream/80',
  reviewing: 'border-amber text-amber',
  resolved: 'border-orange text-orange',
  dismissed: 'border-cream/20 text-cream/50',
  escalated: 'border-orange text-orange',
}
