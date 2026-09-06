import Link from 'next/link'
import { EscalationNotice } from './EscalationNotice'

/**
 * Temporary. Replaced by the real screen in slices 2-4 (access gate, complaint
 * form, suggestion form, track-by-reference). Exists so slice 1's shell can be
 * clicked through in a browser without hitting a 404.
 */
export function ComingInNextSlice({
  title,
  summary,
}: {
  title: string
  summary: string
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-4 leading-relaxed text-cream/75">{summary}</p>

      <p className="mt-6 rounded-lg border border-hairline bg-espresso-raised p-4 text-sm text-cream/60">
        This screen is not built yet. Slice 1 delivered the database, the
        anonymity guarantees, and the shell you are looking at.
      </p>

      <div className="mt-8">
        <EscalationNotice />
      </div>

      <Link
        href="/"
        className="mt-8 inline-block text-sm font-semibold text-orange underline underline-offset-4"
      >
        &larr; Back
      </Link>
    </div>
  )
}
