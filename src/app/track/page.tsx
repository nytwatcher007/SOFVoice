import Link from 'next/link'
import { requireMember } from '@/lib/session'
import { TrackForm } from './TrackForm'

export const metadata = { title: 'Track a submission — SoF Voice' }

export default async function TrackPage() {
  await requireMember()

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">
        Track a submission
      </h1>
      <p className="mt-4 leading-relaxed text-cream/75">
        Enter the reference code you were given to see its status and any reply.
      </p>

      <TrackForm />

      <p className="mt-10 rounded-lg border border-hairline bg-espresso-raised p-4 text-sm leading-relaxed text-cream/60">
        <span className="font-semibold text-cream">Lost your code?</span> It
        cannot be recovered. Only a one-way hash is stored, so there is no way for
        anyone &mdash; including the chairperson &mdash; to find your submission
        without it. If it mattered, submit again and save the new code.
      </p>

      <Link
        href="/"
        className="mt-10 inline-block text-sm font-semibold text-orange underline underline-offset-4"
      >
        &larr; Back
      </Link>
    </div>
  )
}
