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
  kind,
  published,
}: {
  id: string
  status: SubmissionStatus
  reply: string | null
  kind: 'complaint' | 'suggestion'
  published: boolean
}) {
  const router = useRouter()
  const [current, setCurrent] = useState<SubmissionStatus>(status)
  const [text, setText] = useState(reply ?? '')
  const [isPublished, setIsPublished] = useState(published)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const configured = isEscalationContactConfigured()

  async function patch(payload: Record<string, unknown>) {
    setPending(true)
    setError(null)
    setSaved(false)

    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const ok = res.ok
    if (!ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not save.')
    } else {
      setSaved(true)
      router.refresh()
    }
    setPending(false)
    return ok
  }

  async function save(next?: SubmissionStatus) {
    const ok = await patch({ status: next ?? current, reply: text })
    if (ok && next) setCurrent(next)
  }

  async function setPublished(next: boolean) {
    const ok = await patch({ published: next })
    if (ok) setIsPublished(next)
    setConfirming(false)
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

      {/* Publishing is only offered for suggestions. Complaints are refused by
          the database anyway (submissions_only_suggestions_published), but not
          showing the control means nobody has to discover that the hard way. */}
      {kind === 'suggestion' && (
        <div className="mt-8 border-t border-hairline pt-6">
          <h2 className="text-sm font-semibold text-cream">Public board</h2>

          {isPublished ? (
            <>
              <p className="mt-2 text-sm text-cream/70">
                Published. Everyone with the access code can read this.
              </p>
              <button
                onClick={() => setPublished(false)}
                disabled={pending}
                className="mt-3 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-cream hover:border-orange disabled:opacity-40"
              >
                {pending ? 'Working…' : 'Unpublish'}
              </button>
              <p className="mt-2 text-xs text-cream/40">
                Unpublishing removes it from the board, but cannot unsee it for
                anyone who already read it.
              </p>
            </>
          ) : !confirming ? (
            <>
              <p className="mt-2 text-sm text-cream/70">Not on the board.</p>
              <button
                onClick={() => setConfirming(true)}
                disabled={pending}
                className="mt-3 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-cream hover:border-orange disabled:opacity-40"
              >
                Publish to board…
              </button>
            </>
          ) : (
            <div className="mt-3 rounded border border-amber/50 bg-amber/10 p-4">
              <p className="text-sm font-semibold text-amber">
                Publish this to the whole cohort?
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-cream/80">
                <li>
                  Everyone with the access code will be able to read it. You
                  can&rsquo;t undo their having read it.
                </li>
                <li>
                  In a cohort this small, phrasing can identify the author even
                  though no name is shown. Read it once more with that in mind.
                </li>
                <li>
                  The board never shows names, even if this person gave one
                  &mdash; they consented to the council seeing it, not everyone.
                </li>
              </ul>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setPublished(true)}
                  disabled={pending}
                  className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-espresso disabled:opacity-40"
                >
                  {pending ? 'Publishing…' : 'Yes, publish'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-cream/70"
                >
                  Cancel
                </button>
              </div>
            </div>
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
