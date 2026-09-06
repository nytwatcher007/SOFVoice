import Link from 'next/link'
import { EscalationNotice } from '@/components/EscalationNotice'
import { requireMember } from '@/lib/session'

export default async function Home() {
  // The real gate. proxy.ts only does an optimistic cookie-presence check and
  // can be bypassed, so every protected page verifies for itself.
  await requireMember()

  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
        The School of Future, Kochi &middot; Student Council
      </p>

      <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
        SoF <span className="text-orange">Voice</span>
      </h1>

      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-cream/75">
        Demand accountability and suggest improvements &mdash; without putting your
        name to it. Open to students and faculty of SoF only.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        <Card
          href="/complaint"
          eyebrow="Anonymous"
          title="Raise a concern"
          body="Something that needs to be answered for. Your name is never recorded — not by the council, not in the database."
        />
        <Card
          href="/suggestion"
          eyebrow="Name optional"
          title="Make a suggestion"
          body="An idea to improve how things run. Anonymous by default; you can choose to add your name if you want credit or a reply."
        />
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-espresso-raised p-5">
          <h2 className="text-sm font-semibold text-cream">How anonymity works here</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream/70">
            There are no accounts. Getting in uses one shared code for everyone, so
            there is no identity for a submission to be linked to. Complaints
            discard any name before they are stored.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/70">
            Because our cohort is small, what you write can still identify you
            through subject matter or phrasing. Keep that in mind when you write.
          </p>
        </div>

        <div className="rounded-lg border border-hairline bg-espresso-raised p-5">
          <h2 className="text-sm font-semibold text-cream">Tracking what you sent</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream/70">
            Every submission returns a reference code like{' '}
            <span className="font-mono text-amber">SV-3KQ7WM2A</span>. Use it to check
            status and read replies.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/70">
            <span className="font-semibold text-cream">Save it immediately.</span> Only
            a one-way hash of the code is stored, so if you lose it nobody can look
            your submission up or recover it &mdash; including the chairperson.
          </p>
          <Link
            href="/track"
            className="mt-4 inline-block text-sm font-semibold text-orange underline underline-offset-4"
          >
            Track a submission
          </Link>
        </div>
      </div>

      <div className="mt-10 max-w-2xl">
        <EscalationNotice />
      </div>
    </div>
  )
}

function Card({
  href,
  eyebrow,
  title,
  body,
}: {
  href: string
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-hairline bg-espresso-raised p-6 transition-colors hover:border-orange"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-amber">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-xl font-bold text-cream group-hover:text-orange">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-cream/70">{body}</p>
    </Link>
  )
}
