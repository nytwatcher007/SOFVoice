/**
 * Create a council admin account and authorise it.
 *
 * Usage:
 *   npm run admin:add -- someone@example.com "Chairperson"
 *
 * Creates the Supabase Auth user (email pre-confirmed) if needed, then inserts
 * the admin_users row that actually grants access. Being an authenticated
 * Supabase user is not enough â€” the row is what matters, which is why
 * revocation is `npm run admin:remove` and takes effect immediately.
 *
 * Prints a generated password once. MFA enrolment happens on first sign-in and
 * is mandatory.
 */
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { randomBytes } from 'node:crypto'

const [email, label] = process.argv.slice(2)
if (!email) {
  console.error('Usage: npm run admin:add -- <email> ["Label"]')
  process.exit(1)
}

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const password = randomBytes(18).toString('base64url')

let userId
const { data: created, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

if (error) {
  if (!/already/i.test(error.message)) {
    console.error('Could not create user:', error.message)
    process.exit(1)
  }
  // Already exists â€” find them and leave their password alone.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!found) {
    console.error('User exists but could not be found.')
    process.exit(1)
  }
  userId = found.id
  console.log(`User already existed â€” password unchanged.`)
} else {
  userId = created.user.id
  console.log(`\nCreated ${email}`)
  console.log(`TEMPORARY PASSWORD: ${password}`)
  console.log('Change it after first sign-in. This is shown once.')
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_ADMIN_URL,
  ssl: { rejectUnauthorized: false },
})
await client.connect()
await client.query(
  `insert into public.admin_users (user_id, email, label)
   values ($1, $2, $3)
   on conflict (user_id) do update set email = excluded.email, label = excluded.label`,
  [userId, email, label ?? null]
)
await client.end()

console.log(`\nAuthorised as admin${label ? ` (${label})` : ''}.`)
console.log('Sign in at /admin/login. MFA enrolment is required on first use.')
