'use client'

import { useState, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sof_voice_interest'

/**
 * Dedupe lives here, in the browser, because the server deliberately keeps no
 * record of who voted. That makes it defeatable — clearing storage or calling
 * the endpoint directly both work — which is why the surrounding copy calls
 * these numbers "interest" rather than votes.
 *
 * localStorage is not identity: it never leaves the device and the server never
 * sees it.
 */
function alreadyVoted(id: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]).includes(id) : false
  } catch {
    return false
  }
}

function remember(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? (JSON.parse(raw) as string[]) : []
    if (!list.includes(id)) list.push(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Storage blocked (private mode). The vote still counts; it just isn't
    // remembered on this device.
  }
}

/** localStorage is an external store, so read it the way React expects. */
const subscribe = () => () => {}

export function InterestButton({ id, initial }: { id: string; initial: number }) {
  const [count, setCount] = useState(initial)
  const [justVoted, setJustVoted] = useState(false)
  const [pending, setPending] = useState(false)

  // Server snapshot is `false` so the markup matches on hydration; the real
  // value is read on the client. useSyncExternalStore rather than an effect —
  // setting state in an effect trips react-hooks/set-state-in-effect and causes
  // an extra render pass.
  const storedVote = useSyncExternalStore(
    subscribe,
    () => alreadyVoted(id),
    () => false
  )
  const voted = storedVote || justVoted

  async function vote() {
    if (voted || pending) return
    setPending(true)
    const res = await fetch(`/api/board/${id}`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      if (typeof data.upvotes === 'number') setCount(data.upvotes)
      remember(id)
      setJustVoted(true)
    }
    setPending(false)
  }

  return (
    <button
      onClick={vote}
      disabled={voted || pending}
      aria-label={voted ? 'Interest already registered' : 'Register interest'}
      className={`flex shrink-0 flex-col items-center rounded-lg border px-4 py-2 transition-colors ${
        voted
          ? 'border-orange text-orange'
          : 'border-hairline text-cream/70 hover:border-orange hover:text-orange'
      } disabled:cursor-default`}
    >
      <span className="text-lg leading-none">{voted ? '★' : '☆'}</span>
      <span className="mt-1 text-sm font-semibold tabular-nums">{count}</span>
    </button>
  )
}
