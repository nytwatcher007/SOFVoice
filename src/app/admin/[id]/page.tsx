import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { getSubmission } from '@/lib/admin-data'
import { STATUS_LABELS, STATUS_TONE } from '@/lib/status'
import { SubmissionActions } from './SubmissionActions'

export const metadata = { title: 'Submission — SoF Voice' }

export default async function AdminSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const s = await getSubmission(id)
  if (!s) notFound()

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link
        href="/admin"
        className="text-sm font-semibold text-orange underline underline-offset-4"
      >
        &larr; Queue
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_TONE[s.status]}`}
        >
          {STATUS_LABELS[s.status].label}
        </span>
        <span className="text-xs text-cream/50">
          {s.kind === 'complaint' ? 'Concern' : 'Suggestion'} &middot; {s.category}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{s.subject}</h1>

      {/* Date only, never a time — invariant 4. A precise timestamp plus a
          small cohort is how an anonymous submission gets attributed. */}
      <p className="mt-2 text-xs text-cream/40">
        {new Date(s.created_on).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {s.kind === 'complaint' ? (
        <p className="mt-5 rounded border border-hairline bg-espresso-raised p-3 text-xs leading-relaxed text-cream/60">
          This is an anonymous complaint. No name was recorded and none can be
          recovered &mdash; not by you, not from the database.
        </p>
      ) : s.name ? (
        <div className="mt-5 rounded border border-amber/40 bg-amber/5 p-3 text-xs leading-relaxed text-cream/80">
          <span className="font-semibold text-amber">Name given voluntarily:</span>{' '}
          {s.name}
          {s.contact && <> &middot; {s.contact}</>}
        </div>
      ) : (
        <p className="mt-5 rounded border border-hairline bg-espresso-raised p-3 text-xs text-cream/60">
          Anonymous suggestion &mdash; the reveal toggle was off.
        </p>
      )}

      <div className="mt-8 whitespace-pre-wrap leading-relaxed text-cream/90">
        {s.body}
      </div>

      <SubmissionActions
        id={s.id}
        status={s.status}
        reply={s.reply}
        kind={s.kind}
        published={s.published}
      />
    </div>
  )
}
