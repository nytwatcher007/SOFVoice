import Link from 'next/link'
import { requireMember } from '@/lib/session'
import { EscalationNotice } from '@/components/EscalationNotice'
import { SuggestionForm } from './SuggestionForm'

export const metadata = { title: 'Make a suggestion — SoF Voice' }

export default async function SuggestionPage() {
  await requireMember()

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
        Name optional
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
        Make a suggestion
      </h1>
      <p className="mt-4 leading-relaxed text-cream/75">
        An idea for improving how things run. Anonymous by default &mdash; you can
        add your name if you want credit or a reply.
      </p>

      <div className="mt-8">
        <EscalationNotice />
      </div>

      <SuggestionForm />

      <Link
        href="/"
        className="mt-10 inline-block text-sm font-semibold text-orange underline underline-offset-4"
      >
        &larr; Back
      </Link>
    </div>
  )
}
