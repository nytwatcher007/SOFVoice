/**
 * Create or rotate the sof_app application role, then apply its grants and
 * policies from supabase/roles/sof_app.sql.
 *
 * Usage:  npm run db:app-role
 *
 * Connects with DATABASE_ADMIN_URL (the postgres role). Prints the DATABASE_URL
 * line to paste into .env.local and into Vercel.
 */
import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

const adminUrl = process.env.DATABASE_ADMIN_URL
if (!adminUrl) {
  console.error('DATABASE_ADMIN_URL is not set (the privileged postgres URL).')
  process.exit(1)
}

const password = randomBytes(24).toString('base64url')

const client = new pg.Client({
  connectionString: adminUrl,
  ssl: { rejectUnauthorized: false },
})
await client.connect()

// Idempotent: create if absent, rotate the password if present.
const { rows } = await client.query(
  'select 1 from pg_roles where rolname = $1',
  ['sof_app']
)

if (rows.length) {
  await client.query(`alter role sof_app with login password '${password}'`)
  console.log('sof_app existed — password rotated.')
} else {
  await client.query(
    `create role sof_app with login nosuperuser nocreatedb nocreaterole
     nobypassrls password '${password}'`
  )
  console.log('sof_app created.')
}

const sql = await readFile('supabase/roles/sof_app.sql', 'utf8')
await client.query(sql)
console.log('Grants and policies applied.')

// VERIFY rather than re-assert. Supabase's supautils extension blocks
// `alter role ... nosuperuser` outright ("Only roles with the SUPERUSER
// attribute may alter roles with the SUPERUSER attribute"), so the attributes
// can only be set at CREATE time. Checking them here means a role that was
// created wrong fails loudly instead of quietly running over-privileged.
const attrs = (
  await client.query(
    `select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
       from pg_roles where rolname = 'sof_app'`
  )
).rows[0]

const bad = Object.entries(attrs).filter(([, v]) => v === true)
if (bad.length) {
  console.error(
    `\nREFUSING TO CONTINUE — sof_app has privileged attributes: ${bad
      .map(([k]) => k)
      .join(', ')}\n` +
      'Drop the role and re-run so it is created with the correct attributes:\n' +
      '  drop role sof_app;'
  )
  await client.end()
  process.exit(1)
}
console.log('Attributes verified:', attrs)

await client.end()

// Supabase's session pooler expects <role>.<project-ref> as the username.
const ref = new URL(adminUrl.replace('postgresql://', 'https://')).username.split('.')[1]
const host = new URL(adminUrl.replace('postgresql://', 'https://')).host

console.log('\nPaste into .env.local (and Vercel) as DATABASE_URL:\n')
console.log(
  `DATABASE_URL=postgresql://sof_app.${ref}:${encodeURIComponent(password)}@${host}/postgres`
)
console.log('\nKeep DATABASE_ADMIN_URL local. It must NOT be set in production.')
