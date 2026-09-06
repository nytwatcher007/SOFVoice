import Link from 'next/link'
import { requireMember } from '@/lib/session'
import { EscalationNotice } from '@/components/EscalationNotice'
import { ComplaintForm } from './ComplaintForm'

export const metadata = { title: 'Raise a concern — SoF Voice' }

export default async function ComplaintPage() {
  await requireMember()

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
        Anonymous
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
        Raise a concern
      </h1>
      <p className="mt-4 leading-relaxed text-cream/75">
        No name is recorded. Any name sent with a complaint is discarded before it
        is saved &mdash; the database will not accept one.
      </p>

      <div className="mt-8">
        <EscalationNotice />
      </div>

      <ComplaintForm />

      <Link
        href="/"
        className="mt-10 inline-block text-sm font-semibold text-orange underline underline-offset-4"
      >
        &larr; Back
      </Link>
    </div>
  )
}
