'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function MfaForm({ enrolled }: { enrolled: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function startEnrolment() {
    setPending(true)
    setError(null)
    const res = await fetch('/api/admin/mfa', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setFactorId(data.factorId)
      setQr(data.qr)
      setSecret(data.secret)
    } else setError(data.error ?? 'Could not start enrolment.')
    setPending(false)
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch('/api/admin/mfa', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, factorId: factorId || undefined }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      router.replace('/admin')
      router.refresh()
      return
    }
    setError(data.error ?? 'That did not work.')
    setPending(false)
  }

  return (
    <div className="mt-8">
      {!enrolled && !qr && (
        <>
          <p className="rounded-lg border border-amber/40 bg-amber/5 p-4 text-sm leading-relaxed text-cream/80">
            This account can read every complaint in the school, including reports
            about staff. A password alone is not enough, so an authenticator app
            is required before you can continue.
          </p>
          <button
            onClick={startEnrolment}
            disabled={pending}
            className="mt-5 w-full rounded-lg bg-orange px-5 py-3 font-semibold text-espresso disabled:opacity-40"
          >
            {pending ? 'Preparing…' : 'Set up authenticator'}
          </button>
        </>
      )}

      {qr && (
        <div className="rounded-lg border border-hairline bg-espresso-raised p-5">
          <p className="text-sm text-cream/75">
            Scan this with Google Authenticator, 1Password, or similar.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Authenticator QR code"
            className="mt-4 rounded bg-white p-2"
            width={200}
            height={200}
          />
          {secret && (
            <p className="mt-3 break-all font-mono text-xs text-cream/50">
              Or enter manually: {secret}
            </p>
          )}
        </div>
      )}

      {(enrolled || qr) && (
        <form onSubmit={verify} className="mt-6">
          <label htmlFor="code" className="block text-sm font-semibold text-cream">
            6-digit code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            className="mt-2 w-full rounded-lg border border-hairline bg-espresso-raised px-4 py-3 font-mono text-2xl tracking-[0.3em] text-cream placeholder:text-cream/20 focus:border-orange focus:outline-none"
          />

          {error && (
            <p role="alert" className="mt-4 text-sm text-orange">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || code.replace(/\s/g, '').length !== 6}
            className="mt-5 w-full rounded-lg bg-orange px-5 py-3 font-semibold text-espresso disabled:opacity-40"
          >
            {pending ? 'Checking…' : 'Verify'}
          </button>
        </form>
      )}
    </div>
  )
}
