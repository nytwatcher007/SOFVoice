import { LoginForm } from './LoginForm'

export const metadata = { title: 'Council sign-in — SoF Voice' }

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
        Student council
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Sign in</h1>
      <p className="mt-4 leading-relaxed text-cream/75">
        Council accounts are named and use two-factor authentication. Unlike the
        submitter side, what you do here is attributable to you &mdash; that is
        deliberate.
      </p>

      <LoginForm />
    </div>
  )
}
