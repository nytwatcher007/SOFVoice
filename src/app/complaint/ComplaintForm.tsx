'use client'

import { useState } from 'react'
import {
  CATEGORIES,
  SUBJECT_MAX,
  BODY_MAX,
  BODY_MIN,
} from '@/lib/categories'
import { ReferenceCodeReceipt } from '@/components/ReferenceCodeReceipt'

export function ComplaintForm() {
  const [category, setCategory] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  if (code) return <ReferenceCodeReceipt code={code} />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const res = await fetch('/api/complaint', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Only these three fields exist. There is no name field on this form and
      // the server would discard one anyway.
      body: JSON.stringify({ category, subject, body }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok && data.referenceCode) {
      setCode(data.referenceCode)
      return
    }
    setError(data.error ?? 'Something went wrong. Try again.')
    setPending(false)
  }

  const field =
    'mt-2 w-full rounded-lg border border-hairline bg-espresso-raised px-4 py-3 text-cream placeholder:text-cream/30 focus:border-orange focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="mt-8">
      <label htmlFor="category" className="block text-sm font-semibold text-cream">
        Category
      </label>
      <select
        id="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={field}
      >
        <option value="">Choose one…</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label htmlFor="subject" className="mt-6 block text-sm font-semibold text-cream">
        Subject
      </label>
      <input
        id="subject"
        value={subject}
        maxLength={SUBJECT_MAX}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="A short summary"
        className={field}
      />

      {/* CLAUDE.md line 118: this warning sits directly above the body field,
          not buried in a footer. It is not decoration. */}
      <p className="mt-6 rounded-lg border border-amber/40 bg-amber/5 p-4 text-sm leading-relaxed text-cream/80">
        <span className="font-semibold text-amber">Before you write.</span> Our
        cohort is small. Even with no name stored, what you describe and the way
        you phrase it can identify you to someone who knows the room. Say what
        you need to say &mdash; but write it knowing that.
      </p>

      <label htmlFor="body" className="mt-6 block text-sm font-semibold text-cream">
        What happened
      </label>
      <textarea
        id="body"
        value={body}
        rows={9}
        maxLength={BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe the issue and what you'd like done about it."
        className={`${field} resize-y`}
      />
      <p className="mt-1 text-right text-xs text-cream/40">
        {body.length}/{BODY_MAX}
        {body.length > 0 && body.length < BODY_MIN && ` · at least ${BODY_MIN}`}
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-orange">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-orange px-5 py-3 font-semibold text-espresso transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? 'Submitting…' : 'Submit anonymously'}
      </button>
    </form>
  )
}
