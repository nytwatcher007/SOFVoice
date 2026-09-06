'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function GateForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const res = await fetch('/api/gate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (res.ok) {
      // refresh() so the server re-renders with the new cookie in place.
      router.replace('/')
      router.refresh()
      return
    }

    const data = await res.json().catch(() => ({}))
    setError(data.error ?? 'Something went wrong. Try again.')
    setPending(false)
  }

  return (
    <form onSubmit={onSubmit} className="mt-8">
      <label htmlFor="code" className="block text-sm font-semibold text-cream">
        Access code
      </label>

      <input
        id="code"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="SOF-XXXX-XXXX-XXXX"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'code-error' : undefined}
        className="mt-2 w-full rounded-lg border border-hairline bg-espresso-raised px-4 py-3 font-mono tracking-wider text-cream placeholder:text-cream/30 focus:border-orange focus:outline-none"
      />

      {error && (
        <p id="code-error" role="alert" className="mt-3 text-sm text-orange">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || code.trim().length === 0}
        className="mt-5 w-full rounded-lg bg-orange px-5 py-3 font-semibold text-espresso transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? 'Checking…' : 'Enter'}
      </button>
    </form>
  )
}
