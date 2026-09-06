import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase'
import { MfaForm } from './MfaForm'

export const metadata = { title: 'Two-factor — SoF Voice' }

export default async function MfaPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const enrolled = !!factors?.totp?.some((f) => f.status === 'verified')

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {enrolled ? 'Two-factor code' : 'Set up two-factor'}
      </h1>
      <p className="mt-4 leading-relaxed text-cream/75">
        {enrolled
          ? 'Enter the current code from your authenticator app.'
          : 'One-time setup for your council account.'}
      </p>

      <MfaForm enrolled={enrolled} />
    </div>
  )
}
