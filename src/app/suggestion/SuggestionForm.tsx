'use client'

import { useState } from 'react'
import {
  CATEGORIES,
  SUBJECT_MAX,
  BODY_MAX,
  BODY_MIN,
  NAME_MAX,
  CONTACT_MAX,
} from '@/lib/categories'
import { ReferenceCodeReceipt } from '@/components/ReferenceCodeReceipt'

export function SuggestionForm() {
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  // Invariant 9: default is off. There is no "remember me".
  const [revealName, setRevealName] = useState(false)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  if (code) return <ReferenceCodeReceipt code={code} />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const res = await fetch('/api/suggestion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category, subject, body, revealName, name, contact }),
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

      <label htmlFor="body" className="mt-6 block text-sm font-semibold text-cream">
        Your suggestion
      </label>
      <textarea
        id="body"
        value={body}
        rows={8}
        maxLength={BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What would you change, and what would it improve?"
        className={`${field} resize-y`}
      />
      <p className="mt-1 text-right text-xs text-cream/40">
        {body.length}/{BODY_MAX}
        {body.length > 0 && body.length < BODY_MIN && ` · at least ${BODY_MIN}`}
      </p>

      {/* Invariant 9. Off unless deliberately switched on. */}
      <div className="mt-8 rounded-lg border border-hairline bg-espresso-raised p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={revealName}
            onChange={(e) => setRevealName(e.target.checked)}
            className="mt-1 size-4 accent-[var(--sof-orange)]"
          />
          <span>
            <span className="font-semibold text-cream">Add my name</span>
            <span className="mt-1 block text-sm leading-relaxed text-cream/70">
              This suggestion is anonymous unless you switch this on. Turn it on
              only if you want credit or a direct reply. What you enter is stored
              and visible to the student council.
            </span>
          </span>
        </label>

        {revealName && (
          <div className="mt-5 border-t border-hairline pt-5">
            <label htmlFor="name" className="block text-sm font-semibold text-cream">
              Your name
            </label>
            <input
              id="name"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />

            <label
              htmlFor="contact"
              className="mt-5 block text-sm font-semibold text-cream"
            >
              How to reach you{' '}
              <span className="font-normal text-cream/50">(optional)</span>
            </label>
            <input
              id="contact"
              value={contact}
              maxLength={CONTACT_MAX}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email, phone, or a handle"
              className={field}
            />
            <p className="mt-2 text-xs leading-relaxed text-cream/50">
              One contact detail only. You can also just use your reference code
              to check back, which needs no contact at all.
            </p>
          </div>
        )}
      </div>

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
        {pending ? 'Submitting…' : revealName ? 'Submit with my name' : 'Submit anonymously'}
      </button>
    </form>
  )
}
