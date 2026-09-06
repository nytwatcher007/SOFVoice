'use client'

import { useState } from 'react'
import { STATUS_LABELS, STATUS_TONE } from '@/lib/status'
import type { SubmissionStatus } from '@/lib/submissions'

interface Tracked {
  kind: 'complaint' | 'suggestion'
  category: string
  subject: string
  status: SubmissionStatus
  reply: string | null
  created_on: string
}

export function TrackForm() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Tracked | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setResult(null)

    // POST, so the code travels in the request body and never in a URL that
    // would be recorded in server logs or browser history.
    const res = await fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok && data.submission) setResult(data.submission)
    else setError(data.error ?? 'Something went wrong. Try again.')
    setPending(false)
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8">
        <label htmlFor="code" className="block text-sm font-semibold text-cream">
          Reference code
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="SV-XXXXXXXX"
          className="mt-2 w-full rounded-lg border border-hairline bg-espresso-raised px-4 py-3 font-mono tracking-wider text-cream placeholder:text-cream/30 focus:border-orange focus:outline-none"
        />
        <p className="mt-2 text-xs text-cream/40">
          Case and hyphens don&rsquo;t matter.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-orange">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="mt-4 w-full rounded-lg bg-orange px-5 py-3 font-semibold text-espresso transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? 'Looking up…' : 'Look up'}
        </button>
      </form>

      {result && (
        <article className="mt-10 rounded-lg border border-hairline bg-espresso-raised p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_TONE[result.status]}`}
            >
              {STATUS_LABELS[result.status].label}
            </span>
            <span className="text-xs text-cream/50">
              {result.kind === 'complaint' ? 'Concern' : 'Suggestion'} &middot;{' '}
              {result.category}
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-cream">{result.subject}</h2>

          <p className="mt-2 text-sm text-cream/60">
            Submitted{' '}
            {new Date(result.created_on).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <p className="mt-4 text-sm leading-relaxed text-cream/75">
            {STATUS_LABELS[result.status].detail}
          </p>

          {result.reply ? (
            <div className="mt-6 border-t border-hairline pt-5">
              <h3 className="text-sm font-semibold text-amber">
                Reply from the council
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-cream/85">
                {result.reply}
              </p>
            </div>
          ) : (
            <p className="mt-6 border-t border-hairline pt-5 text-sm text-cream/50">
              No reply yet.
            </p>
          )}

          <p className="mt-6 text-xs leading-relaxed text-cream/40">
            What you originally wrote isn&rsquo;t shown here. Anyone holding this
            code could open this page, so it deliberately shows the status rather
            than repeating the full submission.
          </p>
        </article>
      )}
    </>
  )
}
