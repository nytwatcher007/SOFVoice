'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Shown exactly once, immediately after submission.
 *
 * Only a SHA-256 of this code is stored, so it genuinely cannot be recovered or
 * looked up by anyone, including the chairperson. The acknowledge checkbox is
 * deliberate friction — losing the code means permanently losing contact with
 * your own submission, and that is worth one extra click.
 */
export function ReferenceCodeReceipt({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (insecure context, permissions). The code is
      // on screen and selectable, so this is not a dead end.
      setCopied(false)
    }
  }

  return (
    <div className="rounded-lg border border-hairline bg-espresso-raised p-6">
      <h2 className="text-xl font-bold text-cream">Submitted.</h2>
      <p className="mt-2 text-sm leading-relaxed text-cream/70">
        Your complaint was recorded with no name attached. Here is your reference
        code.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <code className="select-all rounded border border-orange bg-espresso px-4 py-3 font-mono text-2xl tracking-widest text-amber">
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-hairline px-4 py-3 text-sm font-semibold text-cream hover:border-orange"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="mt-5 rounded border border-orange/50 bg-orange/10 p-4 text-sm leading-relaxed text-cream">
        <span className="font-semibold">Save this now.</span> Only a one-way hash
        of the code is stored, so if you lose it nobody can look your submission
        up or recover it &mdash; including the chairperson. This is the only time
        it will be shown.
      </p>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-cream/80">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--sof-orange)]"
        />
        I&rsquo;ve saved my reference code somewhere safe.
      </label>

      <Link
        href="/"
        aria-disabled={!saved}
        tabIndex={saved ? undefined : -1}
        onClick={(e) => {
          if (!saved) e.preventDefault()
        }}
        className={`mt-5 inline-block rounded-lg px-5 py-3 font-semibold transition-opacity ${
          saved
            ? 'bg-orange text-espresso hover:opacity-90'
            : 'pointer-events-none bg-orange/30 text-espresso/50'
        }`}
      >
        Done
      </Link>
    </div>
  )
}
