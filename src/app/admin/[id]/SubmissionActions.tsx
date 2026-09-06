'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { STATUS_LABELS } from '@/lib/status'
import type { SubmissionStatus } from '@/lib/submissions'
import { ESCALATION_CONTACT, isEscalationContactConfigured } from '@/lib/escalation'

const STATUSES: SubmissionStatus[] = [
  'new',
  'reviewing',
  'resolved',
  'dismissed',
  'escalated',
]

export function SubmissionActions({
  id,
  status,
  reply,
}: {
  id: string
  status: SubmissionStatus
  reply: string | null
}) {
  const router = useRouter()
  const [current, setCurrent] = useState<SubmissionStatus>(status)
  const [text, setText] = useState(reply ?? '')
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const configured = isEscalationContactConfigured()

  async function save(next?: SubmissionStatus) {
    setPending(true)
    setError(null)
    setSaved(false)

    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next ?? current, reply: text }),
    })

    if (res.ok) {
      if (next) setCurrent(next)
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not save.')
    }
    setPending(false)
  }

  return (
    <div className="mt-8 rounded-lg border border-hairline bg-espresso-raised p-5">
      <h2 className="text-sm font-semibold text-cream">Status</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => save(s)}
            disabled={pending}
            className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-40 ${
              current === s
                ? 'border-orange text-orange'
                : 'border-hairline text-cream/60 hover:border-cream/40'
            }`}
          >
            {STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      {current === 'escalated' && (
        <div className="mt-4 rounded border border-amber/50 bg-amber/10 p-4 text-sm leading-relaxed text-cream/85">
          {configured ? (
            <>
              Marked as passed on. Send the details to{' '}
              <span className="font-semibold text-cream">
                {ESCALATION_CONTACT.name}
              </span>{' '}
              ({ESCALATION_CONTACT.role}) at{' '}
              <span className="font-mono">{ESCALATION_CONTACT.contact}</span>.
              You are not the only reader of this entry.
            </>
          ) : (
            <span className="font-mono text-xs">
              LAUNCH BLOCKER — no escalation contact is configured, so this
              status currently routes nowhere. Set ESCALATION_CONTACT in
              src/lib/escalation.ts before launch.
            </span>
          )}
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-cream">Reply</h2>
      <p className="mt-1 text-xs leading-relaxed text-cream/50">
        Visible to anyone holding the reference code. Write it as if the whole
        cohort might read it, because you cannot know who is looking.
      </p>
      <textarea
        value={text}
        rows={6}
        onChange={(e) => setText(e.target.value)}
        placeholder="What was done, or why it wasn't."
        className="mt-3 w-full resize-y rounded-lg border border-hairline bg-espresso px-4 py-3 text-cream placeholder:text-cream/30 focus:border-orange focus:outline-none"
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-orange">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => save()}
          disabled={pending}
          className="rounded-lg bg-orange px-5 py-2.5 font-semibold text-espresso disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Save reply'}
        </button>
        {saved && <span className="text-sm text-cream/60">Saved.</span>}
      </div>
    </div>
  )
}
