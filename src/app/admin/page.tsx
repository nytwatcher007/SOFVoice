import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { listSubmissions } from '@/lib/admin-data'
import { STATUS_LABELS, STATUS_TONE } from '@/lib/status'
import type { SubmissionKind, SubmissionStatus } from '@/lib/submissions'

export const metadata = { title: 'Queue — SoF Voice' }

const STATUSES: SubmissionStatus[] = [
  'new',
  'reviewing',
  'resolved',
  'dismissed',
  'escalated',
]

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>
}) {
  const admin = await requireAdmin()
  const sp = await searchParams

  const status = STATUSES.includes(sp.status as SubmissionStatus)
    ? (sp.status as SubmissionStatus)
    : undefined
  const kind =
    sp.kind === 'complaint' || sp.kind === 'suggestion'
      ? (sp.kind as SubmissionKind)
      : undefined

  const submissions = await listSubmissions({ status, kind })

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        active ? 'border-orange text-orange' : 'border-hairline text-cream/60'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Queue</h1>
        <span className="text-xs text-cream/50">
          Signed in as {admin.email}
          {admin.label ? ` · ${admin.label}` : ''}
        </span>
      </div>

      {/* No counts, no volume, no category tallies — CLAUDE.md lines 120-121.
          In a cohort this small, "3 this week under Community & conduct" plus
          knowing who was in the room can identify someone. */}
      <p className="mt-3 text-sm text-cream/50">
        Work through the queue. Deliberately shows no totals or trends &mdash;
        counts would help narrow who wrote what.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {chip('All', '/admin', !status && !kind)}
        {STATUSES.map((s) =>
          chip(STATUS_LABELS[s].label, `/admin?status=${s}`, status === s)
        )}
        {chip('Concerns', '/admin?kind=complaint', kind === 'complaint')}
        {chip('Suggestions', '/admin?kind=suggestion', kind === 'suggestion')}
      </div>

      {submissions.length === 0 ? (
        <p className="mt-12 rounded-lg border border-hairline bg-espresso-raised p-6 text-cream/60">
          Nothing here.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/${s.id}`}
                className="block rounded-lg border border-hairline bg-espresso-raised p-5 transition-colors hover:border-orange"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_TONE[s.status]}`}
                  >
                    {STATUS_LABELS[s.status].label}
                  </span>
                  <span className="text-xs text-cream/50">
                    {s.kind === 'complaint' ? 'Concern' : 'Suggestion'} &middot;{' '}
                    {s.category}
                  </span>
                  {s.name && (
                    <span className="text-xs text-amber">named · {s.name}</span>
                  )}
                </div>
                <h2 className="mt-3 font-semibold text-cream">{s.subject}</h2>
                {/* Date only. No time — invariant 4. */}
                <p className="mt-1 text-xs text-cream/40">
                  {new Date(s.created_on).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
