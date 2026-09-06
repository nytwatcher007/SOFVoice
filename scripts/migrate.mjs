// Applies supabase/migrations/*.sql in filename order, tracked in _migrations.
// Run: npm run db:migrate
import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIR = 'supabase/migrations'

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await c.connect()

await c.query(`
  create table if not exists public._migrations (
    name text primary key,
    applied_on date not null default (now() at time zone 'utc')::date
  )
`)

const applied = new Set(
  (await c.query('select name from public._migrations')).rows.map((r) => r.name)
)

const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort()
let ran = 0

for (const f of files) {
  if (applied.has(f)) {
    console.log(`skip  ${f} (already applied)`)
    continue
  }
  const sql = await readFile(join(DIR, f), 'utf8')
  try {
    await c.query('begin')
    await c.query(sql)
    await c.query('insert into public._migrations (name) values ($1)', [f])
    await c.query('commit')
    console.log(`OK    ${f}`)
    ran++
  } catch (e) {
    await c.query('rollback')
    console.error(`FAIL  ${f}\n      ${e.message}`)
    await c.end()
    process.exit(1)
  }
}

console.log(ran ? `\n${ran} migration(s) applied.` : '\nNothing to do.')
await c.end()
