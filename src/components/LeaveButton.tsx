'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LeaveButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function leave() {
    setPending(true)
    await fetch('/api/gate', { method: 'DELETE' })
    router.replace('/enter')
    // Without refresh() the cached server render of the protected page can be
    // restored by the back button after the cookie is gone.
    router.refresh()
  }

  return (
    <button
      onClick={leave}
      disabled={pending}
      className="text-xs font-semibold text-cream/60 underline underline-offset-4 hover:text-orange disabled:opacity-40"
    >
      {pending ? 'Leaving…' : 'Leave'}
    </button>
  )
}
