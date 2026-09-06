// One-off audit: what can the app's connection identity actually do, and is
// physical insertion order recoverable? Run: node --env-file=.env.local scripts/audit-privs.mjs
import pg from 'pg'

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

const role = (
  await c.query(
    `select rolname, rolsuper, rolbypassrls, rolcreaterole
       from pg_roles where rolname = current_user`
  )
).rows[0]
console.log('connection identity:', role)

// Does RLS actually apply to us, or are we bypassing it?
const rls = (
  await c.query(
    `select relrowsecurity, relforcerowsecurity
       from pg_class where oid = 'public.submissions'::regclass`
  )
).rows[0]
console.log('table rls flags:', rls)

// ctid = physical location. If insertion order is recoverable from it, the
// created_on + 6h bucket scheme does not actually hide submission sequence.
await c.query(`insert into public.submissions (kind,category,subject,body,ref_hash)
  values ('complaint','A','ctid probe 1','x','probe_hash_1'),
         ('complaint','A','ctid probe 2','x','probe_hash_2'),
         ('complaint','A','ctid probe 3','x','probe_hash_3')`)

const order = (
  await c.query(
    `select ctid, subject from public.submissions
      where ref_hash like 'probe_hash_%' order by ctid`
  )
).rows
console.log('\nORDER BY ctid ->')
for (const r of order) console.log(' ', r.ctid, r.subject)

await c.query(`delete from public.submissions where ref_hash like 'probe_hash_%'`)
console.log('\n(probe rows deleted)')
await c.end()
