import { redirect } from 'next/navigation'
import { GateForm } from './GateForm'
import { getSession } from '@/lib/session'

export const metadata = { title: 'Enter — SoF Voice' }

export default async function EnterPage() {
  // Already inside; don't show the gate again.
  if (await getSession()) redirect('/')

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
        Students &amp; faculty only
      </p>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
        SoF <span className="text-orange">Voice</span>
      </h1>

      <p className="mt-4 leading-relaxed text-cream/75">
        This portal is a closed circuit. Enter the access code shared with SoF
        students and faculty to continue.
      </p>

      <GateForm />

      {/* Required by CLAUDE.md "Known gaps" item 3. An absolute claim of
          untraceability would be one a sharp student is right to doubt, and
          being caught overstating it costs more trust than the caveat does. */}
      <section className="mt-12 rounded-lg border border-hairline bg-espresso-raised p-5">
        <h2 className="text-sm font-semibold text-cream">
          What we can and cannot promise
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-cream/70">
          <li>
            <span className="text-cream">There are no accounts.</span> Everyone
            uses the same code, so there is no identity for a complaint to be
            attached to.
          </li>
          <li>
            <span className="text-cream">Complaints store no name.</span> Any name
            sent with a complaint is discarded before it is saved. The database
            will not accept one.
          </li>
          <li>
            <span className="text-cream">
              Our hosting provider records connection metadata
            </span>{' '}
            for a limited period, which the council cannot access. We cannot
            promise that no record of your visit exists anywhere.
          </li>
          <li>
            <span className="text-cream">Our cohort is small.</span> What you write
            can still identify you through subject matter or phrasing, whatever
            the database stores.
          </li>
        </ul>
      </section>
    </div>
  )
}
