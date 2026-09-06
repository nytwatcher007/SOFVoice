import Link from 'next/link'
import { requireMember } from '@/lib/session'
import { listBoard } from '@/lib/board'
import { InterestButton } from './InterestButton'

export const metadata = { title: 'Suggestion board — SoF Voice' }

export default async function BoardPage() {
  await requireMember()
  const entries = await listBoard()

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Suggestion board</h1>
      <p className="mt-4 leading-relaxed text-cream/75">
        Suggestions the council has published for everyone to see. Star the ones
        you&rsquo;d like taken forward.
      </p>

      {/* Honest about what the number is. A "vote" that can be gamed damages
          trust more than an "interest" count that admits its limits. */}
      <p className="mt-4 rounded-lg border border-hairline bg-espresso-raised p-4 text-sm leading-relaxed text-cream/60">
        These are counts of <span className="text-cream">interest</span>, not
        votes. The portal deliberately keeps no record of who starred what, so
        they can&rsquo;t be exact &mdash; treat them as a signal, not a ballot.
        Suggestions are shown without names, whether or not the author gave one.
      </p>

      {entries.length === 0 ? (
        <p className="mt-12 rounded-lg border border-hairline bg-espresso-raised p-6 text-cream/60">
          Nothing published yet. Suggestions appear here once the council puts
          them up.
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex gap-4 rounded-lg border border-hairline bg-espresso-raised p-5"
            >
              <InterestButton id={e.id} initial={e.upvotes} />
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-amber">
                  {e.category}
                </span>
                <h2 className="mt-2 font-bold text-cream">{e.subject}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-cream/75">
                  {e.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/"
        className="mt-10 inline-block text-sm font-semibold text-orange underline underline-offset-4"
      >
        &larr; Back
      </Link>
    </div>
  )
}
