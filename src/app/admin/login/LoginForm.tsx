'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      router.replace(data.mfaRequired ? '/admin/mfa' : '/admin')
      router.refresh()
      return
    }
    setError(data.error ?? 'Something went wrong.')
    setPending(false)
  }

  const field =
    'mt-2 w-full rounded-lg border border-hairline bg-espresso-raised px-4 py-3 text-cream placeholder:text-cream/30 focus:border-orange focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="mt-8">
      <label htmlFor="email" className="block text-sm font-semibold text-cream">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={field}
      />

      <label htmlFor="password" className="mt-5 block text-sm font-semibold text-cream">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={field}
      />

      {error && (
        <p role="alert" className="mt-4 text-sm text-orange">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-lg bg-orange px-5 py-3 font-semibold text-espresso transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
